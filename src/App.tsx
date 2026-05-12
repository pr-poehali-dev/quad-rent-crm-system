import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const BASE = 'https://functions.poehali.dev/5d75bdb9-edda-4422-995f-ba98d98b5d7c';

const App = () => {
  useEffect(() => {
    fetch(`${BASE}?resource=ping`).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
