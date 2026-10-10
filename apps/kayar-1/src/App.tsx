import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/sora';
import { Toaster } from '@project/components/ui/sonner';
import { PreviewProvider } from './lib/preview';
import { CmsProvider } from './lib/cms';
import { SessionProvider } from './lib/session';
import { Landing, BlogList, BlogPost, StaticPage } from './pages/Site';
import { Login, ChangePassword } from './pages/AppAuth';
import AppShell from './components/app/AppShell';
import { AppHome, Morshed, Bodyyar, Profile, Notifications } from './pages/AppPages';
import AdminShell, { AdminLogin } from './components/admin/AdminShell';
import { AdminDashboard, AdminCustomers, AdminContent, AdminPosts, AdminMedia, AdminMorshed, AdminSettings, AdminAudit, AdminAnnouncements, AdminStaff } from './pages/Admin';
import { NotFound, Styleguide } from './pages/Misc';

export default function App() {
  useEffect(() => {
    const h = document.documentElement;
    h.lang = 'fa'; h.dir = 'rtl'; h.classList.add('dark', 'js');
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }, []);
  return (
    <SessionProvider scope="app"><SessionProvider scope="admin"><PreviewProvider><CmsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/p/:slug" element={<StaticPage />} />
          <Route path="/app/login" element={<Login />} />
          <Route path="/app/change-password" element={<ChangePassword />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<AppHome />} />
            <Route path="morshed" element={<Morshed />} />
            <Route path="bodyyar" element={<Bodyyar />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<AdminDashboard />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="morshed" element={<AdminMorshed />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
          {import.meta.env.DEV && <Route path="/styleguide" element={<Styleguide />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" dir="rtl" />
    </CmsProvider></PreviewProvider></SessionProvider></SessionProvider>
  );
}
