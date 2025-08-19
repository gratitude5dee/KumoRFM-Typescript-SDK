import { z } from "npm:zod";

export const PredictBodySchema = z.object({
  query: z.string().min(1),
  graph: z
    .object({
      tables: z.array(
        z.object({
          name: z.string(),
          rows: z.array(z.record(z.any())),
          metadata: z
            .object({
              primaryKey: z.string().optional(),
              columns: z.array(
                z.object({
                  name: z.string(),
                  type: z.string().optional(),
                }),
              ).optional(),
            })
            .optional(),
        }),
      ),
      links: z
        .array(
          z.object({
            fromTable: z.string(),
            fromColumn: z.string(),
            toTable: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export const GraphSchema = z.object({
  tables: z.array(
    z.object({
      name: z.string(),
      rows: z.array(z.record(z.any())),
    }),
  ),
  links: z
    .array(
      z.object({
        fromTable: z.string(),
        fromColumn: z.string(),
        toTable: z.string(),
      }),
    )
    .optional(),
});
