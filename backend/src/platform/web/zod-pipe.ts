import { BadRequestException } from "@nestjs/common";
import type { PipeTransform } from "@nestjs/common";
import type { z } from "zod";
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new BadRequestException("Invalid request input");
    return result.data;
  }
}
