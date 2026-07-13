'use client'

import { useEffect, useRef } from 'react'

// Official TradingView embed loader. Widgets are free to use with the
// attribution link included below (per TradingView widget terms).
// https://www.tradingview.com/widget-docs/
export function TradingViewWidget({
  script,
  config,
  height,
  attribution,
}: {
  script: string                        // e.g. 'embed-widget-ticker-tape'
  config: Record<string, unknown>
  height?: number | string
  attribution?: { href: string; label: string }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const configJson = JSON.stringify(config)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    container.innerHTML = ''
    const s = document.createElement('script')
    s.src = `https://s3.tradingview.com/external-embedding/${script}.js`
    s.type = 'text/javascript'
    s.async = true
    s.innerHTML = configJson
    container.appendChild(s)
    return () => { container.innerHTML = '' }
  }, [script, configJson])

  return (
    <div className="tradingview-widget-container" style={{ height, width: '100%' }}>
      <div ref={ref} className="tradingview-widget-container__widget" style={{ height: attribution ? 'calc(100% - 20px)' : '100%', width: '100%' }} />
      {attribution && (
        <div className="tradingview-widget-copyright" style={{ fontSize: '11px', lineHeight: '20px', textAlign: 'right', paddingRight: '8px' }}>
          <a href={attribution.href} rel="noopener nofollow" target="_blank" style={{ color: 'var(--t2)', textDecoration: 'none' }}>
            {attribution.label} by TradingView
          </a>
        </div>
      )}
    </div>
  )
}

export function TickerTape() {
  return (
    <div style={{ borderBottom: '1px solid var(--bd)', background: 'var(--bg)', overflow: 'hidden', height: '40px' }}>
      <TradingViewWidget
        script="embed-widget-ticker-tape"
        height={40}
        config={{
          symbols: [
            { proName: 'OANDA:XAUUSD',    title: 'Gold' },
            { proName: 'CAPITALCOM:US100', title: 'NAS100' },
            { proName: 'OANDA:EURUSD',    title: 'EUR/USD' },
            { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
            { proName: 'CAPITALCOM:DE40', title: 'DAX' },
            { proName: 'BITSTAMP:BTCUSD', title: 'BTC' },
          ],
          showSymbolLogo: true,
          colorTheme: 'dark',
          isTransparent: true,
          displayMode: 'adaptive',
          locale: 'en',
        }}
      />
    </div>
  )
}

export function AdvancedChart({ symbol = 'OANDA:XAUUSD', height = 480 }: { symbol?: string; height?: number }) {
  return (
    <TradingViewWidget
      script="embed-widget-advanced-chart"
      height={height}
      attribution={{ href: `https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/`, label: 'Chart' }}
      config={{
        autosize: true,
        symbol,
        interval: '60',
        timezone: 'Europe/Vienna',
        theme: 'dark',
        style: '1',
        locale: 'en',
        backgroundColor: 'rgba(12, 12, 12, 1)',
        gridColor: 'rgba(255, 255, 255, 0.04)',
        hide_top_toolbar: false,
        allow_symbol_change: true,
        save_image: false,
        support_host: 'https://www.tradingview.com',
      }}
    />
  )
}

export function MarketOverview({ height = 420 }: { height?: number }) {
  return (
    <TradingViewWidget
      script="embed-widget-market-overview"
      height={height}
      attribution={{ href: 'https://www.tradingview.com/markets/', label: 'Market data' }}
      config={{
        colorTheme: 'dark',
        dateRange: '1D',
        showChart: true,
        locale: 'en',
        isTransparent: true,
        showSymbolLogo: true,
        showFloatingTooltip: false,
        plotLineColorGrowing: 'rgba(0, 217, 110, 1)',
        plotLineColorFalling: 'rgba(255, 51, 71, 1)',
        gridLineColor: 'rgba(255, 255, 255, 0)',
        scaleFontColor: 'rgba(112, 112, 112, 1)',
        belowLineFillColorGrowing: 'rgba(0, 217, 110, 0.08)',
        belowLineFillColorFalling: 'rgba(255, 51, 71, 0.08)',
        symbolActiveColor: 'rgba(77, 143, 255, 0.12)',
        tabs: [
          {
            title: 'Marco’s markets',
            symbols: [
              { s: 'OANDA:XAUUSD',     d: 'Gold' },
              { s: 'CAPITALCOM:US100', d: 'NAS100' },
              { s: 'OANDA:EURUSD',     d: 'EUR/USD' },
              { s: 'CAPITALCOM:DE40',  d: 'DAX' },
            ],
          },
          {
            title: 'Indices',
            symbols: [
              { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
              { s: 'FOREXCOM:DJI',    d: 'Dow 30' },
              { s: 'INDEX:NKY',       d: 'Nikkei 225' },
            ],
          },
          {
            title: 'Crypto',
            symbols: [
              { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' },
              { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' },
            ],
          },
        ],
      }}
    />
  )
}
