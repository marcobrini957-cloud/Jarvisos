//+------------------------------------------------------------------+
//|  VelquorBridge.mq5                                               |
//|  Syncs MT5 account data to VELQUOR via HTTP POST                 |
//|  Place in: MQL5/Experts/VelquorBridge.mq5                        |
//+------------------------------------------------------------------+
#property copyright "VELQUOR"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

//── Inputs ────────────────────────────────────────────────────────────────────
input string InpApiKey      = "";                          // Your VELQUOR API Key (vq_...)
input string InpBridgeUrl   = "https://bridge.velquor.app"; // Bridge server URL
input int    InpIntervalSec = 10;                          // Sync interval (seconds)
input int    InpHistoryDays = 30;                          // Days of closed trades to send
input bool   InpDebugMode   = false;                       // Print debug logs

//── Globals ───────────────────────────────────────────────────────────────────
string   g_syncUrl;
string   g_disconnectUrl;
datetime g_lastSync = 0;
string   g_eaVersion = "1.00";

//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(InpApiKey) < 10 || StringFind(InpApiKey, "vq_") != 0)
   {
      Alert("VelquorBridge: Invalid API key. Must start with vq_");
      return INIT_PARAMETERS_INCORRECT;
   }

   g_syncUrl       = InpBridgeUrl + "/sync";
   g_disconnectUrl = InpBridgeUrl + "/disconnect";

   // Allow the bridge domain for WebRequest
   // The user must also add the domain in MT5:
   //   Tools → Options → Expert Advisors → Allow WebRequest for listed URLs
   //   Add: https://bridge.velquor.app

   EventSetTimer(InpIntervalSec);
   Print("VelquorBridge v", g_eaVersion, " started. Syncing every ", InpIntervalSec, "s to ", InpBridgeUrl);
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
// Build the full JSON payload and POST it to /sync
//+------------------------------------------------------------------+
void PostSync()
{
   string json = BuildPayload();
   if(StringLen(json) == 0) return;

   if(InpDebugMode) Print("Payload: ", StringSubstr(json, 0, 200), "...");

   int    result  = 0;
   char   data[];
   char   response[];
   string headers = "Content-Type: application/json\r\nX-Api-Key: " + InpApiKey;
   string responseHeaders;

   StringToCharArray(json, data, 0, StringLen(json), CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1); // strip null terminator

   int httpCode = WebRequest("POST", g_syncUrl, headers, 5000, data, response, responseHeaders);

   if(httpCode == 200)
   {
      if(InpDebugMode) Print("Sync OK (", ArraySize(response), " bytes)");
   }
   else
   {
      string resp = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
      Print("VelquorBridge sync failed — HTTP ", httpCode, " | ", resp);
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

   // ── meta ────────────────────────────────────────────────────────
   out += "\"ea_version\":\"" + g_eaVersion + "\",";
   out += "\"broker\":\"" + EscapeJson(AccountInfoString(ACCOUNT_COMPANY)) + "\",";

   // ── account snapshot ────────────────────────────────────────────
   double balance        = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity         = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin         = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin     = AccountInfoDouble(ACCOUNT_FREEMARGIN);
   double marginLevel    = (margin > 0) ? (equity / margin * 100.0) : 0.0;
   int    openCount      = PositionsTotal();

   out += "\"account\":{";
   out += "\"balance\":"           + DoubleToStr(balance,     2) + ",";
   out += "\"equity\":"            + DoubleToStr(equity,      2) + ",";
   out += "\"margin_used\":"       + DoubleToStr(margin,      2) + ",";
   out += "\"free_margin\":"       + DoubleToStr(freeMargin,  2) + ",";
   out += "\"margin_level_pct\":"  + DoubleToStr(marginLevel, 2) + ",";
   out += "\"open_trades_count\":" + IntegerToString(openCount);
   out += "},";

   // ── open positions ───────────────────────────────────────────────
   out += "\"open_positions\":[";
   for(int i = 0; i < openCount; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(i > 0) out += ",";

      string sym     = PositionGetString(POSITION_SYMBOL);
      int    posType = (int)PositionGetInteger(POSITION_TYPE); // 0=buy, 1=sell
      double lots    = PositionGetDouble(POSITION_VOLUME);
      double openPx  = PositionGetDouble(POSITION_PRICE_OPEN);
      double curPx   = PositionGetDouble(POSITION_PRICE_CURRENT);
      double sl      = PositionGetDouble(POSITION_SL);
      double tp      = PositionGetDouble(POSITION_TP);
      double profit  = PositionGetDouble(POSITION_PROFIT);
      double swap    = PositionGetDouble(POSITION_SWAP);
      long   openMs  = (long)PositionGetInteger(POSITION_TIME); // unix seconds

      out += "{";
      out += "\"ticket\":"      + IntegerToString((long)ticket) + ",";
      out += "\"symbol\":\""    + EscapeJson(sym) + "\",";
      out += "\"trade_type\":"  + IntegerToString(posType) + ",";
      out += "\"lot_size\":"    + DoubleToStr(lots,   2) + ",";
      out += "\"open_price\":"  + DoubleToStr(openPx, 5) + ",";
      out += "\"current_price\":" + DoubleToStr(curPx, 5) + ",";
      out += "\"stop_loss\":"   + DoubleToStr(sl,     5) + ",";
      out += "\"take_profit\":" + DoubleToStr(tp,     5) + ",";
      out += "\"profit\":"      + DoubleToStr(profit, 2) + ",";
      out += "\"swap\":"        + DoubleToStr(swap,   2) + ",";
      out += "\"commission\":0,";
      out += "\"open_time\":"   + IntegerToString(openMs);
      out += "}";
   }
   out += "],";

   // ── closed trades (history) ──────────────────────────────────────
   datetime fromTime = TimeCurrent() - (datetime)(InpHistoryDays * 86400);
   HistorySelect(fromTime, TimeCurrent());

   // Group deals into positions by DEAL_POSITION_ID
   // We collect only OUT deals (they have the final profit/swap/commission)
   out += "\"closed_trades\":[";

   int dealTotal  = HistoryDealsTotal();
   bool firstDeal = true;

   for(int i = 0; i < dealTotal; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) continue;

      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      ulong posId   = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      string sym    = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double lots   = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double closePx = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit  = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double swap    = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      long   closeTime = (long)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      // Find the matching IN deal for this position
      double openPx   = 0;
      long   openTime = closeTime;
      double sl = 0, tp = 0;
      int    openType = (dealType == DEAL_TYPE_BUY) ? 1 : 0; // OUT buy means original was sell

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
         openType = (int)HistoryDealGetInteger(inTicket, DEAL_TYPE); // 0=buy, 1=sell
         // Try to get SL/TP from the associated order
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
      out += "\"ticket\":"      + IntegerToString((long)posId)  + ",";
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
// Minimal JSON string escaping
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

//+------------------------------------------------------------------+
string DoubleToStr(double val, int digits)
{
   return DoubleToString(val, digits);
}
