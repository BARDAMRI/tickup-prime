import React from 'react';
import ReactDOM from 'react-dom/client';
import {TickUpPrimeTier} from './components/TickUpProducts';
import {TickUpRenderEngine} from './types/chartOptions';

if (typeof document !== 'undefined') {
    document.title = 'TickUp Prime — Evaluation Mode';
}

const root = document.getElementById('root') as HTMLElement;

ReactDOM.createRoot(root).render(
    <React.StrictMode>
        <div style={{height: '100vh', width: '100vw'}}>
            <TickUpPrimeTier
                licenseUserIdentifier="tester@tickup.com"
                licenseKey="TKUP-PRO-HGLHS0CXCSUWLHANHKS0"
                chartOptions={{
                    base: {
                        engine: TickUpRenderEngine.prime,
                        showCrosshair: true,
                        showCrosshairValues: true,
                    }
                }}
            />
        </div>
    </React.StrictMode>
);