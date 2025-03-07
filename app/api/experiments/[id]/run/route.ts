import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await params;
    const id = Number.parseInt(params.id)

    // Check if experiment exists
    const experiment = await db.getExperimentDetails(id)
    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    // Check if experiment is already running
    if (experiment.status === "running" || experiment.status === "queued") {
      return NextResponse.json({ error: "Experiment is already running or queued" }, { status: 400 })
    }

    // Queue the experiment
    await db.queueExperiment(id)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error running experiment:", error)
    return NextResponse.json({ error: "Failed to run experiment" }, { status: 500 })
  }
}
