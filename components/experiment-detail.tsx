"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { getExperimentDetails, runExperiment } from "@/lib/api"
import type { Experiment, ExperimentDetails } from "@/types/experiment"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  const [details, setDetails] = useState<ExperimentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(experiment.status === "running")

  useEffect(() => {
    fetchDetails()

    // Poll for updates if experiment is running
    let interval: NodeJS.Timeout | null = null
    if (experiment.status === "running" || experiment.status === "queued") {
      interval = setInterval(fetchDetails, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [experiment.id])

  const fetchDetails = async () => {
    try {
      const data = await getExperimentDetails(experiment.id)
      setDetails(data)
      setIsRunning(data.status === "running" || data.status === "queued")
    } catch (error) {
      console.error("Failed to fetch experiment details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch experiment details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRunAgain = async () => {
    try {
      await runExperiment(experiment.id)
      toast({
        title: "Experiment started",
        description: "The experiment has been queued for execution",
      })
      setIsRunning(true)
      fetchDetails()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start experiment",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "running":
        return <Badge className="bg-blue-500">Running</Badge>
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>
      case "queued":
        return <Badge className="bg-yellow-500">Queued</Badge>
      default:
        return <Badge className="bg-gray-500">Not Started</Badge>
    }
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading experiment details...</div>
  }

  if (!details) {
    return <div className="flex justify-center p-4">Failed to load experiment details</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{details.name}</CardTitle>
            <CardDescription>Created on {new Date(details.created_at).toLocaleString()}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(details.status)}
            {!isRunning && details.status !== "completed" && <Button onClick={handleRunAgain}>Run Again</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isRunning && (
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span>Progress</span>
                <span>
                  {details.current_epoch} / {details.epochs} epochs
                </span>
              </div>
              <Progress value={(details.current_epoch / details.epochs) * 100} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Learning Rate</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{details.learning_rate}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Batch Size</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{details.batch_size}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Epochs</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{details.epochs}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Optimizer</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold capitalize">{details.optimizer}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Model Architecture</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">Type</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-bold capitalize">{details.model_type}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">Hidden Layers</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-bold">{details.hidden_layers}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">Neurons Per Layer</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-bold">{details.neurons_per_layer}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {details.status === "completed"
              ? "Final metrics and training history"
              : "Results will appear here once the experiment is completed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {details.status === "completed" ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">{(details.accuracy * 100).toFixed(2)}%</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Loss</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">{details.loss.toFixed(4)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Duration</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">{details.duration.toFixed(2)}s</p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="loss" className="w-full">
                <TabsList>
                  <TabsTrigger value="loss">Loss</TabsTrigger>
                  <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
                </TabsList>
                <TabsContent value="loss" className="pt-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={details.history.map((h, i) => ({ epoch: i + 1, train: h.train_loss, val: h.val_loss }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="train" stroke="#8884d8" name="Training Loss" />
                      <Line type="monotone" dataKey="val" stroke="#82ca9d" name="Validation Loss" />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="accuracy" className="pt-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={details.history.map((h, i) => ({ epoch: i + 1, train: h.train_acc, val: h.val_acc }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="train" stroke="#8884d8" name="Training Accuracy" />
                      <Line type="monotone" dataKey="val" stroke="#82ca9d" name="Validation Accuracy" />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-gray-500">
                {isRunning
                  ? "Experiment is currently running. Results will be available once completed."
                  : "Experiment has not been run yet. Click 'Run Again' to start."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}

