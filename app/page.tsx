"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ExperimentForm from "@/components/experiment-form"
import ExperimentList from "@/components/experiment-list"
import ExperimentDetail from "@/components/experiment-detail"
import type { Experiment } from "@/types/experiment"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [activeTab, setActiveTab] = useState("new")

  const handleExperimentSelect = (experiment: Experiment) => {
    setSelectedExperiment(experiment)
    setActiveTab("detail")
  }

  return (
    <main className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">MNIST Experiment Manager</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">New Experiment</TabsTrigger>
          <TabsTrigger value="list">Experiments</TabsTrigger>
          <TabsTrigger value="detail">
            Experiment Details{" "}
            {!selectedExperiment && (
              <span className="ml-1 text-xs text-muted-foreground"></span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Experiment</CardTitle>
              <CardDescription>Configure hyperparameters for your MNIST classification experiment</CardDescription>
            </CardHeader>
            <CardContent>
              <ExperimentForm onSuccess={() => setActiveTab("list")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Experiment History</CardTitle>
              <CardDescription>View and compare your previous experiments</CardDescription>
            </CardHeader>
            <CardContent>
              <ExperimentList onExperimentSelect={handleExperimentSelect} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail" className="mt-6">
          {selectedExperiment ? (
            <ExperimentDetail experiment={selectedExperiment} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Experiment Selected</CardTitle>
                <CardDescription>Please select an experiment from the Experiments tab to view details</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center p-8">
                <Button onClick={() => setActiveTab("list")}>Go to Experiments List</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}

