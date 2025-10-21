import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateNew() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/upload-dwg-to-svg", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Backend response:", data); 

      setLoading(false);
      setOpen(false);

      if (data.error) {
        alert("Conversion failed: " + data.error);
        return;
      }

      // Navigate to WorkBench with SVG url
      navigate(`/Workbench/${data.id}`, { state: { svgUrl: data.svg_url } });
    } catch (err) {
      setLoading(false);
      console.error("Upload failed:", err);
      alert("Upload failed, check backend logs.");
    }
  };

  return (
    <>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => setOpen(true)}
      >
        Create New
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl mb-4 bg-black">Upload CAD File</h2>
            <input
              className="border p-2 w-full bg-black"
              type="file"
              accept=".dxf,.dwg"
              onChange={(e) => {
                const files = e.target.files;
                setFile(files && files[0] ? files[0] : null);
              }}
            />

            <div className="flex gap-2 mt-4 justify-end">
              <button
                className="px-3 py-1 border rounded bg-gray-200"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                {loading ? "Processing..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
