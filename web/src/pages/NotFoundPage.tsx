import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-7xl font-bold text-teal-600">404</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The page you're looking for doesn't exist, or you don't have permission to view it.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
        <Button variant="ghost" onClick={() => window.history.back()}>Go back</Button>
      </div>
    </div>
  );
}
