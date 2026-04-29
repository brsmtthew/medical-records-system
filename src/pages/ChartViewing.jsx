import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

export default function ChartViewing() {
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  return (
    <DashboardLayout>
      <div className="p-6">

        <h1 className="text-2xl font-bold mb-4">Chart Viewing</h1>

        {/* FILE PICKER */}
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="mb-4"
        />

        {/* FILE LIST */}
        <div className="grid grid-cols-3 gap-4">
          {files.map((file, index) => (
            <div key={index} className="border p-2 rounded shadow">

              <p className="text-sm font-bold mb-2">{file.name}</p>

              {/* IMAGE PREVIEW */}
              {file.type.startsWith("image/") && (
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="w-full h-40 object-cover rounded"
                />
              )}

              {/* PDF VIEW */}
              {file.type === "application/pdf" && (
                <iframe
                  src={URL.createObjectURL(file)}
                  title="pdf"
                  className="w-full h-40"
                />
              )}

            </div>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}