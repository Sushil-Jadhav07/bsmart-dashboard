import { useSearchParams } from 'react-router-dom';

// A filter value mirrored in the URL query string, so other pages can deep-link to it.
export default function useUrlParam(key) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) || 'all';
  const setValue = (next) => {
    const params = new URLSearchParams(searchParams);
    if (!next || next === 'all') params.delete(key);
    else params.set(key, next);
    setSearchParams(params, { replace: true });
  };
  return [value, setValue];
}
