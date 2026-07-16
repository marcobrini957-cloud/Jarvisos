//+------------------------------------------------------------------+
//|  VelquorBridge.mq5                                               |
//|  Syncs MT5 account data to VELQUOR + copy trading support        |
//|  Place in: MQL5/Experts/VelquorBridge.mq5                        |
//+------------------------------------------------------------------+
#property copyright "VELQUOR"
#property version   "2.00"
#property strict

#include <Trade\Trade.mqh>

//── Copy mode enum ────────────────────────────────────────────────────────────
enum ENUM_COPY_MODE
{
   COPY_OFF    = 0,  // OFF — standard sync only
   COPY_MASTER = 1,  // MASTER — broadcast my trades to slaves
   COPY_SLAVE  = 2,  // SLAVE — receive and execute copied trades
};

//── Lot sizing enum ───────────────────────────────────────────────────────────
enum ENUM_LOT_MODE
{
   LOT_PROPORTIONAL = 0,  // Proportional — master lots × multiplier
   LOT_FIXED        = 1,  // Fixed lot — always use InpCopyLotFixed
};

//── Inputs ────────────────────────────────────────────────────────────────────
input string         InpApiKey      = "";                            // Your VELQUOR API Key (vq_...)
input string         InpBridgeUrl   = "https://bridge.velquor.app"; // Bridge server URL
input int            InpIntervalSec = 10;                            // Sync interval (seconds)
input int            InpHistoryDays = 30;                            // Days of closed trades to send
input bool           InpDebugMode   = false;                         // Print debug logs
input bool           InpFileBridge  = false;                         // Cloud mode: write payload to file (sidecar forwards it)

// ── Copy trading inputs ─────────────────────────────────────────────────────
input ENUM_COPY_MODE InpCopyMode     = COPY_OFF;  // Copy Mode
input string         InpCopyGroupId  = "";         // Copy Group ID (paste from VELQUOR dashboard)
input ENUM_LOT_MODE  InpCopyLotMode  = LOT_PROPORTIONAL; // Slave lot sizing
input double         InpCopyLotFixed = 0.01;       // Fixed lot size (slave, LOT_FIXED mode)
input double         InpCopyLotMult  = 1.0;        // Lot multiplier (slave, LOT_PROPORTIONAL mode)
input double         InpCopyMaxLot   = 10.0;       // Maximum lot per copied trade (slave)
input int            InpCopyPollMs   = 2000;       // Slave poll interval ms (default 2000)

//── Globals ───────────────────────────────────────────────────────────────────
string   g_syncUrl;
string   g_disconnectUrl;
string   g_copySignalUrl;
string   g_copyPollUrl;
string   g_copyAckUrl;
string   g_eaVersion   = "2.00";
string   g_mt5Login;
CTrade   g_trade;

// Master: track tickets we have already signalled to avoid duplicates
ulong    g_signaledOpen[];
ulong    g_signaledClose[];

// Slave: local master_ticket → slave_ticket mapping
long     g_masterTickets[];
long     g_slaveTickets[];
int      g_mappingSize = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(InpApiKey) < 10 || StringFind(InpApiKey, "vq_") != 0)
   {
      Alert("VelquorBridge: Invalid API key. Must start with vq_");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(InpCopyMode != COPY_OFF && StringLen(InpCopyGroupId) < 10)
   {
      Alert("VelquorBridge: Copy Mode is enabled but Copy Group ID is empty. Paste it from the VELQUOR dashboard.");
      return INIT_PARAMETERS_INCORRECT;
   }

   g_syncUrl       = InpBridgeUrl + "/sync";
   g_disconnectUrl = InpBridgeUrl + "/disconnect";
   g_copySignalUrl = InpBridgeUrl + "/copy/signal";
   g_copyPollUrl   = InpBridgeUrl + "/copy/poll";
   g_copyAckUrl    = InpBridgeUrl + "/copy/ack";
   g_mt5Login      = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

   g_trade.SetExpertMagicNumber(20260001);
   g_trade.SetDeviationInPoints(20);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   ArrayResize(g_signaledOpen,  0);
   ArrayResize(g_signaledClose, 0);
   ArrayResize(g_masterTickets, 0);
   ArrayResize(g_slaveTickets,  0);

   // Set timers: normal sync every InpIntervalSec + fast copy poll every InpCopyPollMs (slave only)
   EventSetTimer(InpIntervalSec);
   if(InpCopyMode == COPY_SLAVE)
      EventSetMillisecondTimer(InpCopyPollMs);

   string modeStr = (InpCopyMode == COPY_MASTER) ? "MASTER" :
                    (InpCopyMode == COPY_SLAVE)   ? "SLAVE"  : "OFF";
   Print("VelquorBridge v", g_eaVersion, " started | Copy: ", modeStr,
         " | Interval: ", InpIntervalSec, "s | Login: ", g_mt5Login);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   PostDisconnect();
   Print("VelquorBridge stopped (reason ", reason, ")");
}

//+------------------------------------------------------------------+
void OnTimer()
{
   PostSync();
}

//+------------------------------------------------------------------+
// Fast millisecond timer — only used by SLAVE mode for polling
//+------------------------------------------------------------------+
void OnTimerMillisecond()
{
   if(InpCopyMode == COPY_SLAVE)
      PollCopySignals();
}

//+------------------------------------------------------------------+
// MASTER: fires immediately on every trade transaction
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction& trans,
   const MqlTradeRequest&     request,
   const MqlTradeResult&      result)
{
   if(InpCopyMode != COPY_MASTER) return;

   // We care about deal events (position open/close)
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;

   ulong dealTicket = trans.deal;
   if(dealTicket == 0) return;

   if(!HistoryDealSelect(dealTicket)) return;

   ENUM_DEAL_ENTRY entry    = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   ENUM_DEAL_TYPE  dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);

   // Skip non-trade deals (balance deposits, etc.)
   if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) return;

   ulong  posId    = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   string symbol   = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double lots     = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double price    = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double sl       = 0, tp = 0;

   // Try to get SL/TP from the associated order
   ulong orderId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_ORDER);
   if(HistoryOrderSelect(orderId))
   {
      sl = HistoryOrderGetDouble(orderId, ORDER_SL);
      tp = HistoryOrderGetDouble(orderId, ORDER_TP);
   }

   string tradeTypeStr = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";

   if(entry == DEAL_ENTRY_IN)
   {
      // Position opened — check we haven't signalled this posId yet
      if(TicketAlreadySignalled(posId, g_signaledOpen)) return;
      AddTicket(posId, g_signaledOpen);
      SendCopySignal("open", posId, symbol, tradeTypeStr, lots, price, sl, tp, 0);
   }
   else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT)
   {
      // Position closed — check we haven't signalled this close yet
      if(TicketAlreadySignalled(posId, g_signaledClose)) return;
      AddTicket(posId, g_signaledClose);
      double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      SendCopySignal("close", posId, symbol, tradeTypeStr, lots, price, sl, tp, closePrice);
   }
}

//+------------------------------------------------------------------+
// MASTER: send a copy signal to the bridge
//+------------------------------------------------------------------+
void SendCopySignal(
   const string signalType,
   const ulong  ticket,
   const string symbol,
   const string tradeType,
   const double lots,
   const double openPrice,
   const double sl,
   const double tp,
   const double closePrice)
{
   string payload = "{\"signal\":{";
   payload += "\"type\":\""        + signalType            + "\",";
   payload += "\"ticket\":"        + IntegerToString((long)ticket) + ",";
   payload += "\"symbol\":\""      + EscapeJson(symbol)    + "\",";
   payload += "\"trade_type\":\""  + tradeType             + "\",";
   payload += "\"lot_size\":"      + DoubleToStr(lots, 2)  + ",";
   payload += "\"open_price\":"    + DoubleToStr(openPrice, 5) + ",";
   payload += "\"stop_loss\":"     + DoubleToStr(sl,  5)   + ",";
   payload += "\"take_profit\":"   + DoubleToStr(tp,  5)   + ",";
   payload += "\"close_price\":"   + DoubleToStr(closePrice, 5);
   payload += "}}";

   string extraHeaders =
      "Content-Type: application/json\r\n"
      "X-Api-Key: "     + InpApiKey      + "\r\n"
      "X-Copy-Group: "  + InpCopyGroupId + "\r\n"
      "X-Mt5-Login: "   + g_mt5Login;

   char   data[];
   char   response[];
   string responseHeaders;

   StringToCharArray(payload, data, 0, StringLen(payload), CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1);

   int httpCode = WebRequest("POST", g_copySignalUrl, extraHeaders, 5000, data, response, responseHeaders);

   if(InpDebugMode)
   {
      string resp = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
      Print("CopySignal [", signalType, "] ticket=", ticket, " HTTP=", httpCode, " resp=", resp);
   }
   else if(httpCode != 200)
   {
      string resp = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
      Print("CopySignal failed — HTTP ", httpCode, " | ", resp);
   }
}

//+------------------------------------------------------------------+
// SLAVE: poll bridge for pending signals and execute them
//+------------------------------------------------------------------+
void PollCopySignals()
{
   char   data[];
   char   response[];
   string responseHeaders;
   string extraHeaders =
      "Content-Type: application/json\r\n"
      "X-Api-Key: "    + InpApiKey      + "\r\n"
      "X-Copy-Group: " + InpCopyGroupId + "\r\n"
      "X-Mt5-Login: "  + g_mt5Login;

   // Empty body for GET — use 1-byte dummy so WebRequest sends headers
   ArrayResize(data, 0);

   int httpCode = WebRequest("GET", g_copyPollUrl, extraHeaders, 3000, data, response, responseHeaders);
   if(httpCode != 200) return;

   string respStr = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   if(InpDebugMode) Print("CopyPoll: ", respStr);

   // Minimal JSON parser for the signals array
   // Expected: {"signals":[{...},{...}]}
   int signalsStart = StringFind(respStr, "\"signals\":");
   if(signalsStart < 0) return;

   int arrStart = StringFind(respStr, "[", signalsStart);
   int arrEnd   = StringFind(respStr, "]", arrStart);
   if(arrStart < 0 || arrEnd < 0) return;

   string arrStr = StringSubstr(respStr, arrStart + 1, arrEnd - arrStart - 1);
   string arrTrim = arrStr;
   StringTrimLeft(arrTrim);
   StringTrimRight(arrTrim);
   if(StringLen(arrTrim) == 0) return;

   // Split on top-level objects (simple approach: split by "},{")
   // We parse each signal object individually
   int pos = 0;
   while(pos < StringLen(arrStr))
   {
      int objStart = StringFind(arrStr, "{", pos);
      if(objStart < 0) break;

      // Find matching closing brace (not nested for our flat objects)
      int depth = 0;
      int objEnd = objStart;
      for(int k = objStart; k < StringLen(arrStr); k++)
      {
         string ch = StringSubstr(arrStr, k, 1);
         if(ch == "{") depth++;
         else if(ch == "}") { depth--; if(depth == 0) { objEnd = k; break; } }
      }

      string objStr = StringSubstr(arrStr, objStart, objEnd - objStart + 1);
      ProcessCopySignal(objStr);
      pos = objEnd + 1;
   }
}

//+------------------------------------------------------------------+
// SLAVE: parse and execute one copy signal object
//+------------------------------------------------------------------+
void ProcessCopySignal(const string objStr)
{
   string logId      = JsonGetString(objStr, "log_id");
   string sigType    = JsonGetString(objStr, "signal_type");
   string symbol     = JsonGetString(objStr, "symbol");
   string tradeType  = JsonGetString(objStr, "trade_type");
   string lotMode    = JsonGetString(objStr, "lot_mode");
   long   masterTicket = (long)StringToInteger(JsonGetString(objStr, "master_ticket"));
   double masterLots = StringToDouble(JsonGetString(objStr, "master_lots"));
   double openPrice  = StringToDouble(JsonGetString(objStr, "open_price"));
   double sl         = StringToDouble(JsonGetString(objStr, "stop_loss"));
   double tp         = StringToDouble(JsonGetString(objStr, "take_profit"));
   double closePrice = StringToDouble(JsonGetString(objStr, "close_price"));
   double lotFixed   = StringToDouble(JsonGetString(objStr, "lot_fixed"));
   double lotMult    = StringToDouble(JsonGetString(objStr, "lot_multiplier"));
   double maxLot     = StringToDouble(JsonGetString(objStr, "max_lot"));

   if(StringLen(logId) == 0 || StringLen(sigType) == 0 || StringLen(symbol) == 0) return;

   // Normalise symbol for this broker (add/remove suffix)
   string brokerSymbol = NormalisedSymbol(symbol);

   string execStatus = "skipped";
   long   slaveTicket = 0;
   double slaveLots   = 0;
   string errorMsg    = "";

   if(sigType == "open")
   {
      // Calculate lot size
      slaveLots = CalcLots(masterLots, lotMode, lotFixed, lotMult, maxLot);

      // Adjust lot to broker constraints
      double minLot  = SymbolInfoDouble(brokerSymbol, SYMBOL_VOLUME_MIN);
      double maxBkLot= SymbolInfoDouble(brokerSymbol, SYMBOL_VOLUME_MAX);
      double lotStep = SymbolInfoDouble(brokerSymbol, SYMBOL_VOLUME_STEP);
      if(lotStep > 0) slaveLots = MathRound(slaveLots / lotStep) * lotStep;
      slaveLots = MathMax(minLot, MathMin(maxBkLot, slaveLots));

      string comment = "VQ:" + IntegerToString(masterTicket);
      bool ok = false;
      if(tradeType == "buy")
         ok = g_trade.Buy(slaveLots, brokerSymbol, 0, sl, tp, comment);
      else if(tradeType == "sell")
         ok = g_trade.Sell(slaveLots, brokerSymbol, 0, sl, tp, comment);

      if(ok)
      {
         slaveTicket = (long)g_trade.ResultOrder();
         StoreMapping(masterTicket, slaveTicket);
         execStatus = "executed";
         Print("CopyTrade OPEN: master=", masterTicket, " slave=", slaveTicket,
               " ", symbol, " ", tradeType, " lots=", slaveLots);
      }
      else
      {
         execStatus = "failed";
         errorMsg   = "Buy/Sell failed retcode=" + IntegerToString(g_trade.ResultRetcode());
         Print("CopyTrade OPEN failed: ", errorMsg);
      }
   }
   else if(sigType == "close")
   {
      // Find our position for this master ticket
      long myTicket = FindSlaveTicket(masterTicket, symbol);
      if(myTicket > 0)
      {
         if(g_trade.PositionClose((ulong)myTicket))
         {
            slaveTicket = myTicket;
            execStatus  = "executed";
            RemoveMapping(masterTicket);
            Print("CopyTrade CLOSE: master=", masterTicket, " slave=", myTicket, " ", symbol);
         }
         else
         {
            execStatus = "failed";
            errorMsg   = "PositionClose failed retcode=" + IntegerToString(g_trade.ResultRetcode());
            Print("CopyTrade CLOSE failed: ", errorMsg);
         }
      }
      else
      {
         execStatus = "skipped";
         errorMsg   = "Slave position not found for master=" + IntegerToString(masterTicket);
         Print("CopyTrade CLOSE skipped: ", errorMsg);
      }
   }

   // Send ACK to bridge
   SendCopyAck(logId, execStatus, slaveTicket, slaveLots, errorMsg);
}

//+------------------------------------------------------------------+
// SLAVE: send execution acknowledgement to bridge
//+------------------------------------------------------------------+
void SendCopyAck(
   const string logId,
   const string status,
   const long   slaveTicket,
   const double slaveLots,
   const string errorMsg)
{
   string payload = "{";
   payload += "\"log_id\":\""      + logId                              + "\",";
   payload += "\"status\":\""      + status                             + "\",";
   payload += "\"slave_ticket\":"  + IntegerToString(slaveTicket)       + ",";
   payload += "\"slave_lots\":"    + DoubleToStr(slaveLots, 2)          + ",";
   payload += "\"error_message\":\"" + EscapeJson(errorMsg)             + "\"";
   payload += "}";

   string extraHeaders =
      "Content-Type: application/json\r\n"
      "X-Api-Key: " + InpApiKey;

   char   data[];
   char   response[];
   string responseHeaders;

   StringToCharArray(payload, data, 0, StringLen(payload), CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1);

   int httpCode = WebRequest("POST", g_copyAckUrl, extraHeaders, 3000, data, response, responseHeaders);
   if(InpDebugMode)
      Print("CopyAck [", status, "] log=", logId, " HTTP=", httpCode);
}

//+------------------------------------------------------------------+
// Calculate slave lot size based on group config
//+------------------------------------------------------------------+
double CalcLots(
   const double masterLots,
   const string lotMode,
   const double lotFixed,
   const double lotMult,
   const double maxLot)
{
   double lots;
   // Server-side lot_mode takes priority if InpCopyLotMode would conflict
   // but we use what the bridge says (lotMode from server config)
   if(lotMode == "fixed" || InpCopyLotMode == LOT_FIXED)
      lots = (lotFixed > 0) ? lotFixed : InpCopyLotFixed;
   else
      lots = masterLots * ((lotMult > 0) ? lotMult : InpCopyLotMult);

   return MathMin(lots, (maxLot > 0) ? maxLot : InpCopyMaxLot);
}

//+------------------------------------------------------------------+
// Find this slave's position ticket for a given master ticket
// Uses in-memory map first, then falls back to scanning open positions by comment
//+------------------------------------------------------------------+
long FindSlaveTicket(const long masterTicket, const string symbol)
{
   // Check in-memory mapping first
   for(int i = 0; i < g_mappingSize; i++)
      if(g_masterTickets[i] == masterTicket) return g_slaveTickets[i];

   // Fallback: scan open positions for VQ:{masterTicket} comment
   string target = "VQ:" + IntegerToString(masterTicket);
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(StringFind(PositionGetString(POSITION_COMMENT), target) >= 0)
         return (long)ticket;
   }
   return 0;
}

//+------------------------------------------------------------------+
// In-memory mapping management (master→slave ticket)
//+------------------------------------------------------------------+
void StoreMapping(const long masterTicket, const long slaveTicket)
{
   ArrayResize(g_masterTickets, g_mappingSize + 1);
   ArrayResize(g_slaveTickets,  g_mappingSize + 1);
   g_masterTickets[g_mappingSize] = masterTicket;
   g_slaveTickets[g_mappingSize]  = slaveTicket;
   g_mappingSize++;
}

void RemoveMapping(const long masterTicket)
{
   for(int i = 0; i < g_mappingSize; i++)
   {
      if(g_masterTickets[i] == masterTicket)
      {
         for(int j = i; j < g_mappingSize - 1; j++)
         {
            g_masterTickets[j] = g_masterTickets[j + 1];
            g_slaveTickets[j]  = g_slaveTickets[j + 1];
         }
         g_mappingSize--;
         ArrayResize(g_masterTickets, g_mappingSize);
         ArrayResize(g_slaveTickets,  g_mappingSize);
         return;
      }
   }
}

//+------------------------------------------------------------------+
// Sent-ticket tracking for master (avoid duplicate signals)
//+------------------------------------------------------------------+
bool TicketAlreadySignalled(const ulong ticket, const ulong& arr[])
{
   for(int i = 0; i < ArraySize(arr); i++)
      if(arr[i] == ticket) return true;
   return false;
}

void AddTicket(const ulong ticket, ulong& arr[])
{
   int sz = ArraySize(arr);
   ArrayResize(arr, sz + 1);
   arr[sz] = ticket;
   // Keep array from growing unbounded (keep last 500 entries)
   if(sz > 500)
   {
      for(int i = 0; i < sz - 499; i++) arr[i] = arr[i + 1];
      ArrayResize(arr, 500);
   }
}

//+------------------------------------------------------------------+
// Try to find the correct symbol for this broker
// (e.g. EURUSD → EURUSDm, EURUSDpro, etc.)
//+------------------------------------------------------------------+
string NormalisedSymbol(const string sym)
{
   // First check if it exists as-is
   if(SymbolInfoInteger(sym, SYMBOL_DIGITS) > 0) return sym;

   // Try common broker suffixes
   string suffixes[] = {"m", ".", "i", "+", "pro", "pro1", "e"};
   for(int i = 0; i < ArraySize(suffixes); i++)
   {
      string candidate = sym + suffixes[i];
      if(SymbolInfoInteger(candidate, SYMBOL_DIGITS) > 0) return candidate;
   }
   return sym; // return original as fallback, will fail at order stage
}

//+------------------------------------------------------------------+
// Cloud mode: atomically write a JSON payload for the sidecar to forward.
// Writes to <name>.tmp then renames to <name> so the sidecar never reads a
// half-written file. Files land in MQL5\Files (terminal data folder).
//+------------------------------------------------------------------+
void WriteBridgeFile(string name, string json)
{
   string tmp = name + ".tmp";
   int h = FileOpen(tmp, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE)
   {
      Print("WriteBridgeFile: cannot open ", tmp, " err=", GetLastError());
      return;
   }
   FileWriteString(h, json);
   FileClose(h);
   FileDelete(name);
   if(!FileMove(tmp, 0, name, 0))
      Print("WriteBridgeFile: rename failed err=", GetLastError());
   else if(InpDebugMode)
      Print("Wrote ", name, " (", StringLen(json), " bytes)");
}

//+------------------------------------------------------------------+
// Build the full JSON payload and POST it to /sync
//+------------------------------------------------------------------+
void PostSync()
{
   string json = BuildPayload();
   if(StringLen(json) == 0) return;

   if(InpDebugMode) Print("Payload: ", StringSubstr(json, 0, 200), "...");

   // Cloud terminals can't use WebRequest (the "Allow WebRequest" permission
   // can't be set headlessly), so they write the payload to a file that a
   // sidecar process in the container forwards to the bridge.
   if(InpFileBridge)
   {
      WriteBridgeFile("vq_sync.json", json);
      return;
   }

   char   data[];
   char   response[];
   string headers = "Content-Type: application/json\r\nX-Api-Key: " + InpApiKey;
   string responseHeaders;

   StringToCharArray(json, data, 0, StringLen(json), CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1);

   ResetLastError();
   int httpCode = WebRequest("POST", g_syncUrl, headers, 5000, data, response, responseHeaders);

   if(httpCode == 200)
   {
      if(InpDebugMode) Print("Sync OK (", ArraySize(response), " bytes)");
   }
   else
   {
      int err = GetLastError();
      string resp = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
      Print("VelquorBridge sync failed — HTTP ", httpCode, " err=", err, " url=", g_syncUrl, " | ", resp);
   }
}

//+------------------------------------------------------------------+
void PostDisconnect()
{
   char   data[];
   char   response[];
   string headers = "Content-Type: application/json\r\nX-Api-Key: " + InpApiKey;
   string responseHeaders;

   string body = "{}";
   StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1);

   WebRequest("POST", g_disconnectUrl, headers, 3000, data, response, responseHeaders);
   Print("VelquorBridge: sent disconnect");
}

//+------------------------------------------------------------------+
// Build JSON payload with account, open positions and closed trades
//+------------------------------------------------------------------+
string BuildPayload()
{
   string out = "{";

   out += "\"ea_version\":\"" + g_eaVersion + "\",";
   out += "\"broker\":\"" + EscapeJson(AccountInfoString(ACCOUNT_COMPANY)) + "\",";

   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin      = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin  = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double marginLevel = (margin > 0) ? (equity / margin * 100.0) : 0.0;
   int    openCount   = PositionsTotal();

   out += "\"account\":{";
   out += "\"balance\":"           + DoubleToStr(balance,     2) + ",";
   out += "\"equity\":"            + DoubleToStr(equity,      2) + ",";
   out += "\"margin_used\":"       + DoubleToStr(margin,      2) + ",";
   out += "\"free_margin\":"       + DoubleToStr(freeMargin,  2) + ",";
   out += "\"margin_level_pct\":"  + DoubleToStr(marginLevel, 2) + ",";
   out += "\"open_trades_count\":" + IntegerToString(openCount);
   out += "},";

   out += "\"open_positions\":[";
   for(int i = 0; i < openCount; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(i > 0) out += ",";

      string sym     = PositionGetString(POSITION_SYMBOL);
      int    posType = (int)PositionGetInteger(POSITION_TYPE);
      double lots    = PositionGetDouble(POSITION_VOLUME);
      double openPx  = PositionGetDouble(POSITION_PRICE_OPEN);
      double curPx   = PositionGetDouble(POSITION_PRICE_CURRENT);
      double sl      = PositionGetDouble(POSITION_SL);
      double tp      = PositionGetDouble(POSITION_TP);
      double profit  = PositionGetDouble(POSITION_PROFIT);
      double swap    = PositionGetDouble(POSITION_SWAP);
      long   openMs  = (long)PositionGetInteger(POSITION_TIME);

      out += "{";
      out += "\"ticket\":"        + IntegerToString((long)ticket) + ",";
      out += "\"symbol\":\""      + EscapeJson(sym) + "\",";
      out += "\"trade_type\":"    + IntegerToString(posType) + ",";
      out += "\"lot_size\":"      + DoubleToStr(lots,   2) + ",";
      out += "\"open_price\":"    + DoubleToStr(openPx, 5) + ",";
      out += "\"current_price\":" + DoubleToStr(curPx,  5) + ",";
      out += "\"stop_loss\":"     + DoubleToStr(sl,     5) + ",";
      out += "\"take_profit\":"   + DoubleToStr(tp,     5) + ",";
      out += "\"profit\":"        + DoubleToStr(profit, 2) + ",";
      out += "\"swap\":"          + DoubleToStr(swap,   2) + ",";
      out += "\"commission\":0,";
      out += "\"open_time\":"     + IntegerToString(openMs);
      out += "}";
   }
   out += "],";

   datetime fromTime = TimeCurrent() - (datetime)(InpHistoryDays * 86400);
   HistorySelect(fromTime, TimeCurrent());

   out += "\"closed_trades\":[";

   int  dealTotal = HistoryDealsTotal();
   bool firstDeal = true;

   for(int i = 0; i < dealTotal; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      ENUM_DEAL_ENTRY entry    = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) continue;

      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      ulong  posId      = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      string sym        = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double lots       = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double closePx    = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit     = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double swap       = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      long   closeTime  = (long)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      double openPx   = 0;
      long   openTime = closeTime;
      double sl = 0, tp = 0;
      int    openType = (dealType == DEAL_TYPE_BUY) ? 1 : 0;

      for(int j = 0; j < dealTotal; j++)
      {
         ulong inTicket = HistoryDealGetTicket(j);
         if(inTicket == 0) continue;
         ulong inPosId = (ulong)HistoryDealGetInteger(inTicket, DEAL_POSITION_ID);
         if(inPosId != posId) continue;
         ENUM_DEAL_ENTRY inEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(inTicket, DEAL_ENTRY);
         if(inEntry != DEAL_ENTRY_IN) continue;

         openPx   = HistoryDealGetDouble(inTicket, DEAL_PRICE);
         openTime = (long)HistoryDealGetInteger(inTicket, DEAL_TIME);
         openType = (int)HistoryDealGetInteger(inTicket, DEAL_TYPE);
         ulong orderId = (ulong)HistoryDealGetInteger(inTicket, DEAL_ORDER);
         if(HistoryOrderSelect(orderId))
         {
            sl = HistoryOrderGetDouble(orderId, ORDER_SL);
            tp = HistoryOrderGetDouble(orderId, ORDER_TP);
         }
         break;
      }

      if(!firstDeal) out += ",";
      firstDeal = false;

      out += "{";
      out += "\"ticket\":"      + IntegerToString((long)posId)   + ",";
      out += "\"symbol\":\""    + EscapeJson(sym) + "\",";
      out += "\"trade_type\":"  + IntegerToString(openType) + ",";
      out += "\"lot_size\":"    + DoubleToStr(lots,    2) + ",";
      out += "\"open_price\":"  + DoubleToStr(openPx,  5) + ",";
      out += "\"close_price\":" + DoubleToStr(closePx, 5) + ",";
      out += "\"stop_loss\":"   + DoubleToStr(sl,      5) + ",";
      out += "\"take_profit\":" + DoubleToStr(tp,      5) + ",";
      out += "\"profit\":"      + DoubleToStr(profit,  2) + ",";
      out += "\"commission\":"  + DoubleToStr(commission, 2) + ",";
      out += "\"swap\":"        + DoubleToStr(swap,    2) + ",";
      out += "\"open_time\":"   + IntegerToString(openTime) + ",";
      out += "\"close_time\":"  + IntegerToString(closeTime);
      out += "}";
   }

   out += "]}";
   return out;
}

//+------------------------------------------------------------------+
// Minimal JSON key-value extractor (flat objects only)
//+------------------------------------------------------------------+
string JsonGetString(const string json, const string key)
{
   string searchKey = "\"" + key + "\":";
   int start = StringFind(json, searchKey);
   if(start < 0) return "";
   start += StringLen(searchKey);

   // Skip whitespace
   while(start < StringLen(json) && StringSubstr(json, start, 1) == " ") start++;

   string firstChar = StringSubstr(json, start, 1);
   if(firstChar == "\"")
   {
      // String value
      start++;
      int end = start;
      while(end < StringLen(json))
      {
         if(StringSubstr(json, end, 1) == "\"" && (end == 0 || StringSubstr(json, end - 1, 1) != "\\"))
            break;
         end++;
      }
      return StringSubstr(json, start, end - start);
   }
   else
   {
      // Number or boolean
      int end = start;
      while(end < StringLen(json))
      {
         string c = StringSubstr(json, end, 1);
         if(c == "," || c == "}" || c == " " || c == "\n") break;
         end++;
      }
      return StringSubstr(json, start, end - start);
   }
}

//+------------------------------------------------------------------+
string EscapeJson(const string s)
{
   string r = s;
   StringReplace(r, "\\", "\\\\");
   StringReplace(r, "\"", "\\\"");
   StringReplace(r, "\n", "\\n");
   StringReplace(r, "\r", "\\r");
   return r;
}

string DoubleToStr(double val, int digits)
{
   return DoubleToString(val, digits);
}
