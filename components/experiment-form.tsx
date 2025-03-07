"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createExperiment } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  learning_rate: z.coerce.number().min(0.0001).max(1),
  batch_size: z.coerce.number().int().min(8).max(512),
  epochs: z.coerce.number().int().min(1).max(50),
  optimizer: z.enum(["sgd", "adam", "adadelta"]),
  model_type: z.enum(["simple", "complex"]),
  hidden_layers: z.coerce.number().int().min(1).max(5),
  neurons_per_layer: z.coerce.number().int().min(32).max(512),
})

type FormValues = z.infer<typeof formSchema>

export default function ExperimentForm({ onSuccess }: { onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Experiment-${new Date().toISOString().slice(0, 16)}`,
      learning_rate: 0.01,
      batch_size: 64,
      epochs: 5,
      optimizer: "adam",
      model_type: "simple",
      hidden_layers: 2,
      neurons_per_layer: 128,
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      await createExperiment(values)
      toast({
        title: "Experiment created",
        description: "Your experiment has been created and queued for execution.",
      })
      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create experiment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experiment Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>A unique name to identify this experiment</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="learning_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Learning Rate: {field.value}</FormLabel>
                <FormControl>
                  <Input
                    type="range"
                    min={0.0001}
                    max={1}
                    step={0.0001}
                    {...field}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="batch_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch Size: {field.value}</FormLabel>
                <FormControl>
                  <Input
                    type="range"
                    min={8}
                    max={512}
                    step={8}
                    {...field}
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="epochs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Epochs: {field.value}</FormLabel>
                <FormControl>
                  <Input
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    {...field}
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="optimizer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Optimizer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select optimizer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sgd">SGD</SelectItem>
                    <SelectItem value="adam">Adam</SelectItem>
                    <SelectItem value="adadelta">Adadelta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model Architecture</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="simple">Simple (MLP)</SelectItem>
                    <SelectItem value="complex">Complex (CNN)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hidden_layers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hidden Layers: {field.value}</FormLabel>
                <FormControl>
                  <Input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    {...field}
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="neurons_per_layer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Neurons Per Layer: {field.value}</FormLabel>
                <FormControl>
                  <Input
                    type="range"
                    min={32}
                    max={512}
                    step={32}
                    {...field}
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating Experiment..." : "Create Experiment"}
        </Button>
      </form>
      <Toaster />
    </Form>
  )
}

