import SvgLoader from '@/components/SvgLoader/SvgLoader';
import NavBar from "@/components/Dashboard_NavBar";
import DrawNav from "@/components/DrawingTools/DrawNav";
import { useRef } from "react";
import { useLocation } from "react-router-dom";
import styles from "../styles/Workbench.module.css";

export default function WorkBench() {
  const navRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const svgUrl =  location.state?.svgUrl ; // passed from CreateNew
  // check if svgUrl is valid
  if (!svgUrl || typeof svgUrl !== "string") {
    return <div className="p-4">No SVG URL provided.</div>;
  }
  console.log("Rendering WorkBench with SVG URL:", svgUrl);

  return (
    <div className={styles.workbenchContainer}>
      <NavBar />

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={navRef}
          className="w-20 bg-gray-100 border-r border-gray-300 p-2 flex flex-col items-center"
        >
          <DrawNav />
        </div>

        <div className="flex-1 bg-white relative">
          <div className="absolute inset-0 p-4 overflow-auto">
            <div className="border border-gray-300 rounded-md shadow-md bg-gray-50 h-full">
              <SvgLoader url={svgUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
