import React from 'react';
import { DashboardProvider } from './context/DashboardContext';
import { MetricRail } from './components/Header/MetricRail';
import { Controls } from './components/Header/Controls';
import { MainStage } from './components/Stage/MainStage';
import { TaskFeedPanel } from './components/Panels/TaskFeedPanel';
import { ParticleSolverPanel } from './components/Panels/ParticleSolverPanel';
import { WorkspaceCodePanel } from './components/Panels/WorkspaceCodePanel';
import { AgentsDispatchPanel } from './components/Panels/AgentsDispatchPanel';
import { SystemStatusPanel } from './components/Panels/SystemStatusPanel';
import { LockModal } from './components/Security/LockModal';
import { WebConsoleModal } from './components/Console/WebConsoleModal';
import { VisualEffectsOverlay } from './components/Effects/VisualEffectsOverlay';
import { useDashboard } from './context/DashboardContext';
import { useTouchGuard } from './hooks/useTouchGuard';
import { useKeybindings } from './hooks/useKeybindings';

const DashboardContent: React.FC = () => {
  const { mosaicEffect } = useDashboard();

  // Activate global safeguards and keyboard shortcuts
  useTouchGuard();
  useKeybindings();

  return (
    <>
      <div className={`app ${mosaicEffect ? 'fx-mosaic' : ''}`}>
        <div className="stage-wrapper">
          <MetricRail />
          <Controls />
          <MainStage />
        </div>

        <section className="panels">
          <TaskFeedPanel />
          <ParticleSolverPanel />
          <WorkspaceCodePanel />
          <AgentsDispatchPanel />
          <SystemStatusPanel />
        </section>
      </div>

      <VisualEffectsOverlay />
      <LockModal />
      <WebConsoleModal />
    </>
  );
};

export function App() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

export default App;
