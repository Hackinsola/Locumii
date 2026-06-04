import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Primary call-to-action for the dashboards (Browse shifts / Post a shift). Full
// width on mobile, capped on desktop. `icon` is a lucide component.
function CTAButton({ label, to, icon: Icon }) {
  const navigate = useNavigate();
  return (
    <Button onClick={() => navigate(to)} className="h-12 w-full max-w-sm gap-2">
      {Icon && <Icon className="size-4" aria-hidden="true" />}
      {label}
    </Button>
  );
}

export default CTAButton;
