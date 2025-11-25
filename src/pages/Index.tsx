import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BusinessSelection } from "@/components/BusinessSelection";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if accessed via referrer (external site or different page)
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    const hasReferrer = referrer && 
      referrer !== window.location.href &&
      !referrer.startsWith(currentOrigin);
    
    // Check if accessed via query string
    const hasQueryString = location.search && location.search.length > 0;
    
    // Check if accessed via POST (via sessionStorage flag set before form submission)
    // This flag can be set by forms that POST to the root route
    const isPostRequest = sessionStorage.getItem("_post_request_flag") === "true";

    // Clear the POST flag if it exists
    if (isPostRequest) {
      sessionStorage.removeItem("_post_request_flag");
    }

    // Redirect to /pricing if any condition is met
    if (hasReferrer || hasQueryString || isPostRequest) {
      navigate("/pricing", { replace: true });
      return;
    }
  }, [navigate, location.search]);

  return <BusinessSelection />;
};

export default Index;
