import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

/**
 * Props Recharts injects into a custom `<Tooltip content={<MyTooltip />} />`. All
 * optional, because the element is created without them and Recharts clones them in.
 */
export type ChartTooltipProps<TValue extends ValueType = ValueType, TName extends NameType = NameType> = Partial<
  Pick<TooltipContentProps<TValue, TName>, 'active' | 'payload' | 'label'>
>
