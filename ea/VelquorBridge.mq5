//+------------------------------------------------------------------+
//|  VelquorBridge.mq5                                               |
//|  Syncs MT5 account data to VELQUOR + copy trading support        |
//|  Place in: MQL5/Experts/VelquorBridge.mq5                        |
//+------------------------------------------------------------------+
#property copyright "VELQUOR"
#property version   "2.20"
#property strict

#include <Trade\Trade.mqh>

//── Copy mode enum ────────────────────────────────────────────────────────────
enum ENUM_COPY_MODE
{
   COPY_OFF    = 0,  // OFF — standard sync only
   COPY_LEADER = 1,  // LEADER — broadcast my trades to followers
   COPY_FOLLOWER  = 2,  // FOLLOWER — receive and execute copied trades
};

//── Lot sizing enum ───────────────────────────────────────────────────────────
enum ENUM_LOT_MODE
{
   LOT_PROPORTIONAL = 0,  // Proportional — leader lots × multiplier
   LOT_FIXED        = 1,  // Fixed lot — always use InpCopyLotFixed
};

//── Inputs ────────────────────────────────────────────────────────────────────
input string         InpApiKey      = "";                            // Your VELQUOR API Key (vq_...)
input string         InpBridgeUrl   = "https://bridge.velquor.app"; // Bridge server URL
input int            InpIntervalSec = 10;                            // Sync interval (seconds)
input int            InpHistoryDays = 30;                            // Days of closed trades to send
input bool           InpDebugMode   = false;                         // Print debug logs
input bool           InpFileBridge  = false;                         // Cloud mode: write payload to file (sidecar forwards it)
input bool           InpAutoScreenshot = true;                       // Auto chart screenshot on trade open/close

// ── Copy trading inputs ─────────────────────────────────────────────────────
input ENUM_COPY_MODE InpCopyMode     = COPY_OFF;  // Copy Mode
input string         InpCopyGroupId  = "";         // Copy Group ID (paste from VELQUOR dashboard)
input ENUM_LOT_MODE  InpCopyLotMode  = LOT_PROPORTIONAL; // Follower lot sizing
input double         InpCopyLotFixed = 0.01;       // Fixed lot size (follower, LOT_FIXED mode)
input double         InpCopyLotMult  = 1.0;        // Lot multiplier (follower, LOT_PROPORTIONAL mode)
input double         InpCopyMaxLot   = 10.0;       // Maximum lot per copied trade (follower)
input int            InpCopyPollMs   = 100;        // Follower inbox check interval ms

//── Globals ───────────────────────────────────────────────────────────────────
string   g_syncUrl;
string   g_disconnectUrl;
string   g_copySignalUrl;
string   g_copyPollUrl;
string   g_copyAckUrl;
string   g_eaVersion   = "2.20";
string   g_mt5Login;
int      g_copyOutSeq  = 0;   // uniquifies cloud copy outbox filenames
ulong    g_lastSyncMs  = 0;   // follower: throttles PostSync inside the fast timer
CTrade   g_trade;

// Leader: track tickets we have already signalled to avoid duplicates
ulong    g_signaledOpen[];
ulong    g_signaledClose[];

// Follower: local leader_ticket → follower_ticket mapping
long     g_leaderTickets[];
long     g_followerTickets[];
int      g_mappingSize = 0;

// Auto screenshots: queued in OnTradeTransaction (cheap array push — that
// handler is the copy-latency hot path), captured later in OnTimer where a
// few hundred ms of chart work can't delay a copy signal for the same fill.
struct PendingShot
{
   ulong    ticket;      // MT5 position id — matches trades.mt5_ticket
   string   symbol;
   double   entryPrice;
   double   exitPrice;   // 0 for open shots
   datetime openTime;
   datetime closeTime;   // 0 for open shots
   bool     isClose;
   datetime dueAt;       // give the fill 2s to appear on the chart
   int      attempts;
   bool     captured;    // PNG written, desktop upload still pending
};
PendingShot g_shots[];

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
   ArrayResize(g_leaderTickets, 0);
   ArrayResize(g_followerTickets,  0);

   // One timer only — MQL5 has a single timer slot and every variant fires
   // OnTimer(). Followers need the fast cadence for copy polling; PostSync is
   // throttled to InpIntervalSec inside OnTimer.
   if(InpCopyMode == COPY_FOLLOWER)
      EventSetMillisecondTimer(InpCopyPollMs);
   else
      EventSetTimer(InpIntervalSec);

   string modeStr = (InpCopyMode == COPY_LEADER) ? "LEADER" :
                    (InpCopyMode == COPY_FOLLOWER)   ? "FOLLOWER"  : "OFF";

   // Cloud mode: publish copy config so the sidecar knows whether to poll the
   // bridge for this terminal (followers) and with which group/login/interval.
   if(InpFileBridge)
   {
      string cfg = "{";
      cfg += "\"mode\":\""     + modeStr        + "\",";
      cfg += "\"group\":\""    + EscapeJson(InpCopyGroupId) + "\",";
      cfg += "\"login\":\""    + g_mt5Login     + "\",";
      cfg += "\"poll_ms\":"    + IntegerToString(InpCopyPollMs);
      cfg += "}";
      WriteBridgeFile("vq_copyconfig.json", cfg);

      // Headless density: every visible Market Watch symbol streams ticks the
      // terminal must process for nobody. Keep only what this account needs;
      // EnsureSymbolReady re-subscribes on demand when a copy signal arrives.
      // NEVER runs for desktop users (their Market Watch is theirs).
      TrimMarketWatch();
   }

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
// Fires every InpCopyPollMs on followers (fast copy poll + throttled sync),
// every InpIntervalSec otherwise.
//+------------------------------------------------------------------+
void OnTimer()
{
   if(InpCopyMode == COPY_FOLLOWER)
   {
      PollCopySignals();
      ulong nowMs = GetTickCount64();
      if(nowMs - g_lastSyncMs >= (ulong)InpIntervalSec * 1000)
      {
         g_lastSyncMs = nowMs;
         PostSync();
      }
      return;
   }
   PostSync();
   ProcessPendingShots();
}

//+------------------------------------------------------------------+
// Fires immediately on every trade transaction. LEADER: broadcast copy
// signals. OFF + LEADER: queue auto screenshots (followers hold mirror
// trades that never reach the journal, so they take no screenshots).
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction& trans,
   const MqlTradeRequest&     request,
   const MqlTradeResult&      result)
{
   bool wantCopy  = (InpCopyMode == COPY_LEADER);
   bool wantShots = (InpAutoScreenshot && InpCopyMode != COPY_FOLLOWER);
   if(!wantCopy && !wantShots) return;

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
      // Copy signal first — its latency is the product; the shot queue is a
      // memory push and can wait.
      if(wantCopy && !TicketAlreadySignalled(posId, g_signaledOpen))
      {
         AddTicket(posId, g_signaledOpen);
         SendCopySignal("open", posId, symbol, tradeTypeStr, lots, price, sl, tp, 0);
      }
      if(wantShots)
         QueueShot(posId, symbol, price, 0,
                   (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME), 0, false);
   }
   else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT)
   {
      double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      if(wantCopy && !TicketAlreadySignalled(posId, g_signaledClose))
      {
         AddTicket(posId, g_signaledClose);
         SendCopySignal("close", posId, symbol, tradeTypeStr, lots, price, sl, tp, closePrice);
      }
      if(wantShots)
      {
         // Entry price/time come from the position's ENTRY_IN deal — the OUT
         // deal only knows the close. Partial closes re-queue the same
         // ticket+slot; QueueShot updates in place so the last close wins.
         double   entryPx   = 0;
         datetime openTime  = 0;
         datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
         if(HistorySelectByPosition(posId))
         {
            int n = HistoryDealsTotal();
            for(int k = 0; k < n; k++)
            {
               ulong dt = HistoryDealGetTicket(k);
               if(dt == 0) continue;
               if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(dt, DEAL_ENTRY) != DEAL_ENTRY_IN) continue;
               entryPx  = HistoryDealGetDouble(dt, DEAL_PRICE);
               openTime = (datetime)HistoryDealGetInteger(dt, DEAL_TIME);
               break;
            }
         }
         QueueShot(posId, symbol, entryPx, closePrice, openTime, closeTime, true);
      }
   }
}

//+------------------------------------------------------------------+
// LEADER: send a copy signal to the bridge
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

   // Cloud mode: hand the signal to the sidecar via an outbox file.
   if(InpFileBridge)
   {
      WriteCopyOutbox("/copy/signal", payload);
      return;
   }

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
// FOLLOWER: poll bridge for pending signals and execute them
//+------------------------------------------------------------------+
void PollCopySignals()
{
   string respStr;

   // Cloud mode: the sidecar polls the bridge and drops pending signals into
   // an inbox file. Read + clear it (rename to a consumed marker) so we don't
   // reprocess — dedup by ticket in ProcessCopySignal is the backstop.
   if(InpFileBridge)
   {
      int fh = FileOpen("vq_cin_signals.json", FILE_READ|FILE_TXT|FILE_ANSI);
      if(fh == INVALID_HANDLE) return;
      respStr = "";
      while(!FileIsEnding(fh)) respStr += FileReadString(fh);
      FileClose(fh);
      FileDelete("vq_cin_signals.json");
      if(StringLen(respStr) < 2) return;
      if(InpDebugMode) Print("CopyPoll(file): ", respStr);
   }
   else
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

      respStr = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
      if(InpDebugMode) Print("CopyPoll: ", respStr);
   }

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
// FOLLOWER: parse and execute one copy signal object
//+------------------------------------------------------------------+
void ProcessCopySignal(const string objStr)
{
   string logId      = JsonGetString(objStr, "log_id");
   string sigType    = JsonGetString(objStr, "signal_type");
   string symbol     = JsonGetString(objStr, "symbol");
   string tradeType  = JsonGetString(objStr, "trade_type");
   string lotMode    = JsonGetString(objStr, "lot_mode");
   long   leaderTicket = (long)StringToInteger(JsonGetString(objStr, "leader_ticket"));
   double leaderLots = StringToDouble(JsonGetString(objStr, "leader_lots"));
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
   long   followerTicket = 0;
   double followerLots   = 0;
   string errorMsg    = "";

   if(sigType == "open")
   {
      // Idempotency: fast redelivery (long-poll returns before our ack lands)
      // must never open the same leader trade twice. The comment scan in
      // FindFollowerTicket catches it even across EA restarts.
      long existing = FindFollowerTicket(leaderTicket, brokerSymbol);
      if(existing > 0)
      {
         execStatus  = "executed";
         followerTicket = existing;
         Print("CopyTrade OPEN duplicate delivery ignored: leader=", leaderTicket,
               " already open as follower=", existing);
         SendCopyAck(logId, execStatus, followerTicket, followerLots, "");
         return;
      }

      // The follower terminal has likely never shown this symbol — without a
      // Market Watch subscription there are no quotes and OrderSend fails
      // with 10021. Select it and wait briefly for the first tick.
      if(!EnsureSymbolReady(brokerSymbol))
      {
         execStatus = "failed";
         errorMsg   = "No quotes for " + brokerSymbol + " (symbol select/tick timeout)";
         Print("CopyTrade OPEN failed: ", errorMsg);
         SendCopyAck(logId, execStatus, followerTicket, followerLots, errorMsg);
         return;
      }

      // Calculate lot size
      followerLots = CalcLots(leaderLots, lotMode, lotFixed, lotMult, maxLot);

      // Adjust lot to broker constraints
      double minLot  = SymbolInfoDouble(brokerSymbol, SYMBOL_VOLUME_MIN);
      double maxBkLot= SymbolInfoDouble(brokerSymbol, SYMBOL_VOLUME_MAX);
      double lotStep = SymbolInfoDouble(brokerSymbol, SYMBOL_VOLUME_STEP);
      if(lotStep > 0) followerLots = MathRound(followerLots / lotStep) * lotStep;
      followerLots = MathMax(minLot, MathMin(maxBkLot, followerLots));

      string comment = "VQ:" + IntegerToString(leaderTicket);
      bool ok = false;
      if(tradeType == "buy")
         ok = g_trade.Buy(followerLots, brokerSymbol, 0, sl, tp, comment);
      else if(tradeType == "sell")
         ok = g_trade.Sell(followerLots, brokerSymbol, 0, sl, tp, comment);

      if(ok)
      {
         followerTicket = (long)g_trade.ResultOrder();
         StoreMapping(leaderTicket, followerTicket);
         execStatus = "executed";
         Print("CopyTrade OPEN: leader=", leaderTicket, " follower=", followerTicket,
               " ", symbol, " ", tradeType, " lots=", followerLots);
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
      // Find our position for this leader ticket
      long myTicket = FindFollowerTicket(leaderTicket, symbol);
      if(myTicket > 0)
      {
         if(g_trade.PositionClose((ulong)myTicket))
         {
            followerTicket = myTicket;
            execStatus  = "executed";
            RemoveMapping(leaderTicket);
            Print("CopyTrade CLOSE: leader=", leaderTicket, " follower=", myTicket, " ", symbol);
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
         errorMsg   = "Follower position not found for leader=" + IntegerToString(leaderTicket);
         Print("CopyTrade CLOSE skipped: ", errorMsg);
      }
   }

   // Send ACK to bridge
   SendCopyAck(logId, execStatus, followerTicket, followerLots, errorMsg);
}

//+------------------------------------------------------------------+
// FOLLOWER: send execution acknowledgement to bridge
//+------------------------------------------------------------------+
void SendCopyAck(
   const string logId,
   const string status,
   const long   followerTicket,
   const double followerLots,
   const string errorMsg)
{
   string payload = "{";
   payload += "\"log_id\":\""      + logId                              + "\",";
   payload += "\"status\":\""      + status                             + "\",";
   payload += "\"follower_ticket\":"  + IntegerToString(followerTicket)       + ",";
   payload += "\"follower_lots\":"    + DoubleToStr(followerLots, 2)          + ",";
   payload += "\"error_message\":\"" + EscapeJson(errorMsg)             + "\"";
   payload += "}";

   // Cloud mode: hand the ack to the sidecar via an outbox file.
   if(InpFileBridge)
   {
      WriteCopyOutbox("/copy/ack", payload);
      return;
   }

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
// Cloud copy bridge: write a self-contained envelope for the sidecar to POST.
// Each envelope is a uniquely-named file so concurrent signals never collide.
//+------------------------------------------------------------------+
void WriteCopyOutbox(const string endpoint, const string body)
{
   g_copyOutSeq++;
   string name = "vq_cout_" + IntegerToString((long)GetTickCount()) + "_" +
                 IntegerToString(g_copyOutSeq) + ".json";
   string envelope = "{";
   envelope += "\"endpoint\":\"" + endpoint + "\",";
   envelope += "\"group\":\""    + EscapeJson(InpCopyGroupId) + "\",";
   envelope += "\"login\":\""    + g_mt5Login + "\",";
   envelope += "\"body\":"       + body;
   envelope += "}";
   WriteBridgeFile(name, envelope);
}

//+------------------------------------------------------------------+
// Cloud terminals: hide every Market Watch symbol this account doesn't use.
// Keeps the chart symbol + symbols with open positions or working orders
// (SymbolSelect(false) refuses those anyway — belt and braces).
//+------------------------------------------------------------------+
void TrimMarketWatch()
{
   int hidden = 0;
   for(int i = SymbolsTotal(true) - 1; i >= 0; i--)
   {
      string sym = SymbolName(i, true);
      if(sym == _Symbol) continue;

      bool inUse = false;
      for(int p = PositionsTotal() - 1; p >= 0 && !inUse; p--)
         if(PositionGetSymbol(p) == sym) inUse = true;
      for(int o = OrdersTotal() - 1; o >= 0 && !inUse; o--)
      {
         ulong t = OrderGetTicket(o);
         if(t > 0 && OrderGetString(ORDER_SYMBOL) == sym) inUse = true;
      }

      if(!inUse && SymbolSelect(sym, false)) hidden++;
   }
   Print("TrimMarketWatch: hid ", hidden, " unused symbols, ",
         SymbolsTotal(true), " remain");
}

//+------------------------------------------------------------------+
// Make sure a symbol is subscribed in Market Watch and has live quotes.
// A freshly-selected symbol needs a moment before the first tick arrives.
//+------------------------------------------------------------------+
bool EnsureSymbolReady(const string symbol)
{
   if(!SymbolSelect(symbol, true))
      return false;

   MqlTick tick;
   for(int i = 0; i < 30; i++)   // up to ~3s
   {
      if(SymbolInfoTick(symbol, tick) && tick.bid > 0 && tick.ask > 0)
         return true;
      Sleep(100);
   }
   return false;
}

//+------------------------------------------------------------------+
// Auto screenshots — queue, capture, deliver
//+------------------------------------------------------------------+
string ShotFileName(const PendingShot &s)
{
   return "vq_shot_" + IntegerToString((long)s.ticket) + "_" + (s.isClose ? "close" : "open") + ".png";
}

void QueueShot(const ulong ticket, const string symbol, const double entryPx,
               const double exitPx, const datetime openTime, const datetime closeTime,
               const bool isClose)
{
   // Same ticket+slot already queued (partial close) — update in place.
   for(int i = 0; i < ArraySize(g_shots); i++)
   {
      if(g_shots[i].ticket == ticket && g_shots[i].isClose == isClose)
      {
         g_shots[i].entryPrice = entryPx;
         g_shots[i].exitPrice  = exitPx;
         g_shots[i].closeTime  = closeTime;
         g_shots[i].dueAt      = TimeCurrent() + 2;
         g_shots[i].captured   = false;
         return;
      }
   }
   int sz = ArraySize(g_shots);
   if(sz >= 20) return;   // runaway guard — journal shots are best-effort
   ArrayResize(g_shots, sz + 1);
   g_shots[sz].ticket     = ticket;
   g_shots[sz].symbol     = symbol;
   g_shots[sz].entryPrice = entryPx;
   g_shots[sz].exitPrice  = exitPx;
   g_shots[sz].openTime   = openTime;
   g_shots[sz].closeTime  = closeTime;
   g_shots[sz].isClose    = isClose;
   g_shots[sz].dueAt      = TimeCurrent() + 2;
   g_shots[sz].attempts   = 0;
   g_shots[sz].captured   = false;
}

void RemoveShot(const int idx)
{
   int last = ArraySize(g_shots) - 1;
   if(idx < last) g_shots[idx] = g_shots[last];
   ArrayResize(g_shots, last);
}

// Fixed timeframe for every shot (open and close) so all screenshots share one
// consistent, branded look. M15 frames typical intraday trades cleanly.
#define SHOT_TIMEFRAME PERIOD_M15

// MT5 does not render OBJPROP_TEXT of an HLINE on the chart (object list only),
// so a level line's meaning is invisible. This draws a real OBJ_TEXT word label
// sitting on the line at the given time anchor, extending right so it never
// clips the price axis.
void DrawLevelLabel(const long cid, const string name, const datetime t,
                    const double price, const string text, const color clr)
{
   ObjectCreate(cid, name, OBJ_TEXT, 0, t, price);
   ObjectSetString(cid,  name, OBJPROP_TEXT, text);
   ObjectSetInteger(cid, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(cid, name, OBJPROP_FONTSIZE, 10);
   ObjectSetString(cid,  name, OBJPROP_FONT, "Arial Bold");
   ObjectSetInteger(cid, name, OBJPROP_ANCHOR, ANCHOR_LEFT_LOWER);
   ObjectSetInteger(cid, name, OBJPROP_BACK, false);
}

// Renders the shot on a throwaway chart — never the EA's own chart, because
// ChartSetSymbolPeriod on it would deinit/reinit this EA mid-session.
bool CaptureShot(PendingShot &s)
{
   ENUM_TIMEFRAMES tf = SHOT_TIMEFRAME;
   if(!EnsureSymbolReady(s.symbol)) return false;

   long cid = ChartOpen(s.symbol, tf);
   if(cid <= 0) return false;

   // The traded symbol is already streaming, so this settles in one pass in
   // practice; the loop is for a cold chart after terminal restart.
   for(int k = 0; k < 20 && !SeriesInfoInteger(s.symbol, tf, SERIES_SYNCHRONIZED); k++)
      Sleep(100);

   // VELQUOR dark look, entry/exit levels marked
   ChartSetInteger(cid, CHART_SHOW_GRID, false);
   ChartSetInteger(cid, CHART_MODE, CHART_CANDLES);
   ChartSetInteger(cid, CHART_AUTOSCROLL, true);
   ChartSetInteger(cid, CHART_SHIFT, true);
   ChartSetInteger(cid, CHART_SCALE, 2);
   ChartSetInteger(cid, CHART_SHOW_VOLUMES, CHART_VOLUME_HIDE);
   ChartSetInteger(cid, CHART_COLOR_BACKGROUND, C'13,17,23');
   ChartSetInteger(cid, CHART_COLOR_FOREGROUND, C'139,148,158');
   ChartSetInteger(cid, CHART_COLOR_GRID,       C'33,38,45');
   ChartSetInteger(cid, CHART_COLOR_CHART_UP,   C'99,153,52');
   ChartSetInteger(cid, CHART_COLOR_CANDLE_BULL,C'99,153,52');
   ChartSetInteger(cid, CHART_COLOR_CHART_DOWN, C'226,75,74');
   ChartSetInteger(cid, CHART_COLOR_CANDLE_BEAR,C'226,75,74');

   // Anchor labels a couple bars in from the left edge so they sit on the price
   // line, readable, without overrunning the right price axis.
   int firstBar = (int)ChartGetInteger(cid, CHART_FIRST_VISIBLE_BAR);
   datetime leftT = iTime(s.symbol, tf, firstBar > 2 ? firstBar - 2 : 0);
   if(leftT <= 0) leftT = (s.isClose ? s.openTime : s.closeTime);
   int digits = (int)SymbolInfoInteger(s.symbol, SYMBOL_DIGITS);

   if(s.entryPrice > 0)
   {
      ObjectCreate(cid, "vq_entry", OBJ_HLINE, 0, 0, s.entryPrice);
      ObjectSetInteger(cid, "vq_entry", OBJPROP_COLOR, C'88,166,255');
      ObjectSetInteger(cid, "vq_entry", OBJPROP_WIDTH, 2);
      DrawLevelLabel(cid, "vq_entry_lbl", leftT, s.entryPrice,
                     "Entry " + DoubleToStr(s.entryPrice, digits), C'88,166,255');
   }
   if(s.isClose && s.exitPrice > 0)
   {
      ObjectCreate(cid, "vq_exit", OBJ_HLINE, 0, 0, s.exitPrice);
      ObjectSetInteger(cid, "vq_exit", OBJPROP_COLOR, C'240,180,41');
      ObjectSetInteger(cid, "vq_exit", OBJPROP_WIDTH, 2);
      DrawLevelLabel(cid, "vq_exit_lbl", leftT, s.exitPrice,
                     "Exit " + DoubleToStr(s.exitPrice, digits), C'240,180,41');
      if(s.openTime > 0)
      {
         ObjectCreate(cid, "vq_open_t", OBJ_VLINE, 0, s.openTime, 0);
         ObjectSetInteger(cid, "vq_open_t", OBJPROP_COLOR, C'48,54,61');
         ObjectSetInteger(cid, "vq_open_t", OBJPROP_STYLE, STYLE_DOT);
      }
   }

   // VELQUOR watermark — bottom-right, Inter (the landing-page wordmark font,
   // bundled into the terminal image; desktop MT5 without Inter falls back to
   // its default sans). Subtle slate so it brands without fighting the candles.
   ObjectCreate(cid, "vq_wm", OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(cid, "vq_wm", OBJPROP_CORNER, CORNER_RIGHT_LOWER);
   ObjectSetInteger(cid, "vq_wm", OBJPROP_ANCHOR, ANCHOR_RIGHT_LOWER);
   ObjectSetInteger(cid, "vq_wm", OBJPROP_XDISTANCE, 14);
   ObjectSetInteger(cid, "vq_wm", OBJPROP_YDISTANCE, 12);
   ObjectSetString(cid,  "vq_wm", OBJPROP_TEXT, "VELQUOR");
   ObjectSetString(cid,  "vq_wm", OBJPROP_FONT, "Inter");
   ObjectSetInteger(cid, "vq_wm", OBJPROP_FONTSIZE, 15);
   ObjectSetInteger(cid, "vq_wm", OBJPROP_COLOR, C'124,135,152');
   ObjectSetInteger(cid, "vq_wm", OBJPROP_BACK, false);

   ChartRedraw(cid);
   Sleep(300);   // one paint cycle — screenshot of an unpainted chart is black

   string tmp = "vq_tmp_shot.png";
   bool ok = ChartScreenShot(cid, tmp, 1280, 720, ALIGN_RIGHT);
   ChartClose(cid);
   if(!ok) return false;

   // Publish atomically — the sidecar must never upload a half-written PNG.
   string fname = ShotFileName(s);
   FileDelete(fname);
   return FileMove(tmp, 0, fname, 0);
}

// Desktop delivery (cloud terminals leave the file for the sidecar).
// Returns the HTTP code; 404 = trade row not synced yet, retry next timer.
int UploadShot(const PendingShot &s)
{
   string fname = ShotFileName(s);
   int h = FileOpen(fname, FILE_READ|FILE_BIN);
   if(h == INVALID_HANDLE) return -1;
   char body[];
   ArrayResize(body, (int)FileSize(h));
   FileReadArray(h, body, 0, WHOLE_ARRAY);
   FileClose(h);

   string url = InpBridgeUrl + "/screenshot?ticket=" + IntegerToString((long)s.ticket)
              + "&slot=" + (s.isClose ? "close" : "open");
   string headers = "Content-Type: image/png\r\nX-Api-Key: " + InpApiKey
                  + "\r\nX-Mt5-Login: " + g_mt5Login;
   char   response[];
   string responseHeaders;
   return WebRequest("POST", url, headers, 8000, body, response, responseHeaders);
}

void ProcessPendingShots()
{
   for(int i = ArraySize(g_shots) - 1; i >= 0; i--)
   {
      if(TimeCurrent() < g_shots[i].dueAt) continue;

      if(!g_shots[i].captured)
      {
         if(!CaptureShot(g_shots[i]))
         {
            g_shots[i].attempts++;
            if(g_shots[i].attempts >= 3)
            {
               Print("Screenshot capture failed 3x — dropping ", ShotFileName(g_shots[i]));
               RemoveShot(i);
            }
            continue;
         }
         g_shots[i].captured = true;
         g_shots[i].attempts = 0;
         if(InpDebugMode) Print("Screenshot captured: ", ShotFileName(g_shots[i]));
      }

      if(InpFileBridge) { RemoveShot(i); continue; }   // sidecar owns the file now

      int code = UploadShot(g_shots[i]);
      if(code == 200)
      {
         FileDelete(ShotFileName(g_shots[i]));
         RemoveShot(i);
      }
      else
      {
         g_shots[i].attempts++;
         // 404 = /sync hasn't landed the trade row yet (10s cadence) — patient.
         int limit = (code == 404) ? 30 : 5;
         if(g_shots[i].attempts >= limit)
         {
            Print("Screenshot upload gave up (HTTP ", code, ") — ", ShotFileName(g_shots[i]));
            FileDelete(ShotFileName(g_shots[i]));
            RemoveShot(i);
         }
      }
   }
}

//+------------------------------------------------------------------+
// Calculate follower lot size based on group config
//+------------------------------------------------------------------+
double CalcLots(
   const double leaderLots,
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
      lots = leaderLots * ((lotMult > 0) ? lotMult : InpCopyLotMult);

   return MathMin(lots, (maxLot > 0) ? maxLot : InpCopyMaxLot);
}

//+------------------------------------------------------------------+
// Find this follower's position ticket for a given leader ticket
// Uses in-memory map first, then falls back to scanning open positions by comment
//+------------------------------------------------------------------+
long FindFollowerTicket(const long leaderTicket, const string symbol)
{
   // Check in-memory mapping first
   for(int i = 0; i < g_mappingSize; i++)
      if(g_leaderTickets[i] == leaderTicket) return g_followerTickets[i];

   // Fallback: scan open positions for VQ:{leaderTicket} comment
   string target = "VQ:" + IntegerToString(leaderTicket);
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
// In-memory mapping management (leader→follower ticket)
//+------------------------------------------------------------------+
void StoreMapping(const long leaderTicket, const long followerTicket)
{
   ArrayResize(g_leaderTickets, g_mappingSize + 1);
   ArrayResize(g_followerTickets,  g_mappingSize + 1);
   g_leaderTickets[g_mappingSize] = leaderTicket;
   g_followerTickets[g_mappingSize]  = followerTicket;
   g_mappingSize++;
}

void RemoveMapping(const long leaderTicket)
{
   for(int i = 0; i < g_mappingSize; i++)
   {
      if(g_leaderTickets[i] == leaderTicket)
      {
         for(int j = i; j < g_mappingSize - 1; j++)
         {
            g_leaderTickets[j] = g_leaderTickets[j + 1];
            g_followerTickets[j]  = g_followerTickets[j + 1];
         }
         g_mappingSize--;
         ArrayResize(g_leaderTickets, g_mappingSize);
         ArrayResize(g_followerTickets,  g_mappingSize);
         return;
      }
   }
}

//+------------------------------------------------------------------+
// Sent-ticket tracking for leader (avoid duplicate signals)
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
