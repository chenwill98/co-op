import React from 'react';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="card w-full max-w-md glass-card rounded-2xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold justify-center mb-4">Analytics Dashboard</h2>
          
          <div className="flex justify-center mb-6">
            <div className="badge badge-lg badge-warning gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-4 h-4 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Under Construction
            </div>
          </div>
          
          <p className="text-base-content text-lg mb-4">
            Our analytics platform is currently being built and will be available soon.
          </p>
          
          <p className="text-base-content text-sm opacity-70">
            Check back later for detailed insights on property performance and market trends.
          </p>
        </div>
      </div>
    </div>
  );
}
