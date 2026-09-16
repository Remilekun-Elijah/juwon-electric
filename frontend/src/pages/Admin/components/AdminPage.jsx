/* eslint-disable react/prop-types */
import { Alert, Button, PageHeader } from "../../../components/ui";
import { getModule } from "../constants/adminConstants";
import { useAdmin } from "./adminContext";

/**
 * Page wrapper for every admin screen: page header from the module metadata, the shared load error, then content.
 * Pass showLoadError={false} when the screen renders its own full error state instead.
 */
const AdminPage = ({ module, actions, showLoadError = true, children }) => {
  const meta = getModule(module);
  const { error, refresh, loading } = useAdmin();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={meta.eyebrow} title={meta.title} description={meta.description} actions={actions} />
      {showLoadError && error && (
        <Alert tone="danger" title="Couldn’t load the latest data">
          <p>{error}</p>
          <Button variant="link" size="sm" className="mt-1 text-red-700" onClick={refresh} disabled={loading}>
            Try again
          </Button>
        </Alert>
      )}
      {children}
    </div>
  );
};

export default AdminPage;
