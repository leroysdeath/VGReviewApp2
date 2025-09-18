/**
 * Diagnostic Page
 * Admin page for search diagnostics and analysis
 */

import React from 'react';
import SearchDiagnosticTool from '../components/SearchDiagnosticTool';

const DiagnosticPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <SearchDiagnosticTool />
    </div>
  );
};

export default DiagnosticPage;