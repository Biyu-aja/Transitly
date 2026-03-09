import { Outlet } from 'react-router-dom';
import Layout from './Layout';
import Header from './Header';
import SideMenu from './SideMenu';
import TrendingSidebar from './TrendingSidebar';
import { useUIStore } from '../store/uiStore';

export default function MainLayout() {
  const { setSearchQuery, trendingTags } = useUIStore();

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout
      header={<Header />}
      sideMenu={<SideMenu />}
      rightSidebar={<TrendingSidebar sortedTags={trendingTags} onTagClick={handleTagClick} />}
    >
      <Outlet />
    </Layout>
  );
}
