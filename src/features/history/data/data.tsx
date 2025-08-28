import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconCircleCheck,
  IconExclamationCircle,
} from '@tabler/icons-react'

export const labels = [
  {
    value: 'bug',
    label: 'Bug',
  },
  {
    value: 'feature',
    label: 'Feature',
  },
  {
    value: 'documentation',
    label: 'Documentation',
  },
]

export const statuses = [
  {
    value: 'pending',
    label: 'Pending',
    icon: IconExclamationCircle,
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: IconCircleCheck,
  },
]

export const priorities = [
  {
    label: 'Low',
    value: 'low',
    icon: IconArrowDown,
  },
  {
    label: 'Medium',
    value: 'medium',
    icon: IconArrowRight,
  },
  {
    label: 'High',
    value: 'high',
    icon: IconArrowUp,
  },
]
