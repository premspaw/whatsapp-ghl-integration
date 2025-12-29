"use client";

import { use } from "react";
import SkinAnalysisResult from "../../../../components/SkinAnalysisResult";
import Navbar from "../../../../components/Navbar";

export default function AnalysisResult({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);

    return (
        <>
            <SkinAnalysisResult />
            <Navbar locationId={locationId} />
        </>
    );
}
