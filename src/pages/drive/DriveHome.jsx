import { useSearchParams } from "react-router-dom";
import DriveCatalogue from "./DriveCatalogue";
import Drive from "./Drive";

/* Drive has two jobs and the spec only redefines one of them.
 *
 * The Drive Module spec (v3) describes an institutional catalogue — content
 * found by category and tag. What already shipped is a private per-user file
 * manager with folders. Rather than replace it (and strand the files people
 * have already uploaded), the catalogue becomes the default view and the folder
 * browser stays reachable beside it.
 *
 * The tab lives in the URL so a link to a catalogue category survives a reload.
 */
export default function DriveHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "files" ? "files" : "catalogue";

  const pick = (next) => {
    // Dropping the other tab's params avoids carrying a folder id into the
    // catalogue, or a category filter into the folder browser.
    setSearchParams(next === "files" ? { tab: "files" } : {});
  };

  return (
    <div>
      <div className="px-4 sm:px-6 pt-4">
        <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 bg-white text-xs">
          {[
            { key: "catalogue", label: "Catalogue" },
            { key: "files", label: "My Files" },
          ].map((t) => (
            <button key={t.key} onClick={() => pick(t.key)}
              className={`px-4 py-2 font-semibold transition-colors ${
                tab === t.key ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "catalogue" ? <DriveCatalogue /> : <Drive />}
    </div>
  );
}
