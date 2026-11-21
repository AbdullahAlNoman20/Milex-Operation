// src/Pages/modules/operations/OperationsRoot.jsx
import { Outlet } from 'react-router-dom';
import { OperationsAuthProvider } from './context/OperationsAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import PhraseTranslator from './components/PhraseTranslator';

const OperationsRoot = () => (
  <OperationsAuthProvider>
    <LanguageProvider>
      <PhraseTranslator />
      <Outlet />
    </LanguageProvider>
  </OperationsAuthProvider>
);

export default OperationsRoot;