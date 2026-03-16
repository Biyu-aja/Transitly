interface TrendingSidebarProps {
  sortedTags: [string, number][];
  onTagClick: (tag: string) => void;
}

export default function TrendingSidebar({ sortedTags, onTagClick }: TrendingSidebarProps) {
  return (
    <div className="hidden md:block w-[280px] xl:w-[350px] pr-2 xl:pr-4 pl-4 shrink-0">
      <div className="sticky top-[80px]">


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
