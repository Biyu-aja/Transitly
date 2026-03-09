interface TrendingSidebarProps {
  sortedTags: [string, number][];
  onTagClick: (tag: string) => void;
}

export default function TrendingSidebar({ sortedTags, onTagClick }: TrendingSidebarProps) {
  return (
    <div className="hidden md:block w-[280px] xl:w-[350px] pr-2 xl:pr-4 pl-4 shrink-0">
      <div className="sticky top-[80px]">
        <h3 className="font-semibold text-text-secondary mb-3 px-2 text-[17px]">Bersponsor</h3>
        <div className="mb-6 space-y-4 px-2">
          {/* Dummy Sponsors matching Meta format */}
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-28 h-28 bg-surface-hover rounded-xl overflow-hidden shadow-sm shrink-0 flex items-center justify-center group-hover:opacity-95 transition-opacity">
              <svg className="w-8 h-8 text-text-secondary opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zm0 16H5z"></path></svg>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary text-[15px] group-hover:underline">Beli Tiket KAI Tanpa Antre</h4>
              <p className="text-[13px] text-text-secondary">tiket.indonesia.go</p>
            </div>
          </div>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-28 h-28 bg-surface-hover rounded-xl overflow-hidden shadow-sm shrink-0 flex items-center justify-center group-hover:opacity-95 transition-opacity">
              <svg className="w-8 h-8 text-text-secondary opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zm0 16H5z"></path></svg>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary text-[15px] group-hover:underline">Promo TransJakarta Akhir Tahun</h4>
              <p className="text-[13px] text-text-secondary">transjakarta.co.id</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-border-light mx-2 mb-4"></div>

        <h3 className="font-semibold text-text-secondary mb-3 px-2 text-[17px]">Topik Tren Perhubungan</h3>
        <div className="space-y-1">
          {sortedTags.length > 0 ? sortedTags.map(([tag, count]) => (
            <div 
              key={tag} 
              onClick={() => onTagClick(tag)}
              className="hover:bg-surface-hover p-2.5 rounded-xl cursor-pointer transition-colors relative"
            >
              <p className="text-[13px] text-text-secondary mb-1">Tren Komuter • {count} postingan</p>
              <h4 className="font-semibold text-brand-500 text-[15px]">{tag}</h4>
            </div>
          )) : (
            <div className="px-2.5 text-[13px] text-text-secondary">Belum ada hashtag tren.</div>
          )}
        </div>
      </div>
    </div>
  );
}
