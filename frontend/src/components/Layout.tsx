import type { ReactNode } from 'react';

interface LayoutProps {
  header: ReactNode;
  sideMenu: ReactNode;
  rightSidebar: ReactNode;
  children: ReactNode;
  lightbox?: ReactNode;
}

export default function Layout({ header, sideMenu, rightSidebar, children, lightbox }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg-body font-sans text-text-primary">
      {header}
      
      <main className="w-full flex justify-between pt-4 lg:pt-6">
        {sideMenu}
        
        <div className="flex-1 max-w-[680px] w-full mx-auto px-2 sm:px-0">
          {children}
        </div>

        {rightSidebar}
      </main>

      {lightbox}
    </div>
  );
}
