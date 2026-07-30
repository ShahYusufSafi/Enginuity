import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/**
 * "Create New" — the legacy DWG → SVG → Workbench flow.
 *
 * @deprecated Superseded by /import. Still here because it's the dashboard's
 * only live action.
 *
 * DWG only: `/upload-dwg-to-svg` writes the upload to a .dwg temp file and
 * hands it to ODA, so a DXF would be mis-fed. DXF belongs at /import.
 */
export default function CreateNew() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const close = () => {
    setOpen(false);
    setFile(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/upload-dwg-to-svg", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Converter returned ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      close();
      navigate(`/Workbench/${data.id}`, { state: { svgUrl: data.svg_url } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        onClick={() => setOpen(true)}
      >
        Create New
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg bg-white p-6 text-gray-900 shadow-xl">
            <h2 className="mb-1 text-xl font-semibold">Upload CAD File</h2>
            <p className="mb-4 text-xs text-gray-500">
              Converts a DWG to a static SVG preview.{" "}
              <Link to="/import" onClick={close} className="text-indigo-600 underline">
                Import
              </Link>{" "}
              gives you measurable, selectable geometry instead.
            </p>

            <input
              className="w-full rounded border p-2"
              type="file"
              accept=".dwg"
              onChange={(e) => {
                const files = e.target.files;
                setFile(files && files[0] ? files[0] : null);
                setError(null);
              }}
            />

            {error && <p className="mt-2 text-xs text-red-600">Conversion failed: {error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border bg-gray-200 px-3 py-1 hover:bg-gray-300"
                onClick={close}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file || loading}
                className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Processing…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
