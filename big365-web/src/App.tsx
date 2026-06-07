import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BizPage from './pages/BizPage';
import DimensionsPage from './pages/DimensionsPage';
import SpacePage from './pages/SpacePage';
import DemoDataPage from './pages/DemoDataPage';
import DocsPage from './pages/DocsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/biz" element={<BizPage />} />
          <Route path="/biz/:biz/dimensions" element={<DimensionsPage />} />
          <Route path="/biz/:biz/space" element={<SpacePage />} />
          <Route path="/biz/:biz/demo-data" element={<DemoDataPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
