import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  yf_symbol: string;
}

export const PortfolioNews: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (showPulse = true) => {
    if (showPulse) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const formatPublishTime = (epochSeconds: number) => {
    const diffMs = Date.now() - epochSeconds * 1000;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getCleanSymbol = (yfSymbol: string) => {
    return yfSymbol.replace('.NS', '').replace('.BO', '');
  };

  return (
    <div className="card card-scrollable accent-line-indigo flex-1 min-h-0 flex flex-col">
      <div className="card-header flex items-center justify-between">
        <div className="card-title flex items-center gap-2 text-slate-700">
          <span>Market & Portfolio News</span>
        </div>
        <button
          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-all duration-150"
          onClick={() => fetchNews(false)}
          disabled={loading || refreshing}
          title="Refresh News"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="card-inner flex-1 min-h-0 flex flex-col p-4 overflow-y-auto news-scroll">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex flex-col gap-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-5/6" />
                <div className="h-3 bg-slate-150 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-slate-400 text-center py-6 text-[13px] font-medium">
            No news articles available.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {news.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1.5 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all duration-150 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-[12.5px] font-semibold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h4>
                  <ExternalLink size={11} className="text-slate-300 shrink-0 group-hover:text-indigo-500 transition-colors mt-0.5" />
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  {item.yf_symbol && item.yf_symbol !== '^NSEI' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700">
                      {getCleanSymbol(item.yf_symbol)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    {item.publisher}
                  </span>
                  <span className="text-[10px] text-slate-300 shrink-0">•</span>
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">
                    {formatPublishTime(item.providerPublishTime)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
