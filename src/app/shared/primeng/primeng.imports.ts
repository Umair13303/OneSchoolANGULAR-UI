/**
 * Common PrimeNG standalone imports for feature screens.
 * Prefer importing only what a component needs; or spread a preset:
 *   imports: [...PRIME_FORM_IMPORTS, ...PRIME_DATA_IMPORTS]
 */
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { Checkbox } from 'primeng/checkbox';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { DatePicker } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Badge } from 'primeng/badge';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tooltip } from 'primeng/tooltip';
import { ProgressSpinner } from 'primeng/progressspinner';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { SelectButton } from 'primeng/selectbutton';
import { Card } from 'primeng/card';
import { Divider } from 'primeng/divider';
import { Menu } from 'primeng/menu';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

/** Forms / actions used on most admin pages */
export const PRIME_FORM_IMPORTS = [
  Button, InputText, InputNumber, Textarea, Select, MultiSelect,
  Checkbox, ToggleSwitch, DatePicker, Tag, Badge, Tooltip,
  IconField, InputIcon, SelectButton
] as const;

/** Data tables + dialogs */
export const PRIME_DATA_IMPORTS = [
  TableModule, Dialog, ConfirmDialog, Toast, ProgressSpinner, Card, Divider, Menu
] as const;

/** Feedback surfaces */
export const PRIME_FEEDBACK_IMPORTS = [Toast, ConfirmDialog, ProgressSpinner, Tag] as const;

/** Tab shells */
export const PRIME_TAB_IMPORTS = [Tabs, TabList, Tab, TabPanels, TabPanel] as const;

/** Full admin CRUD page preset */
export const PRIME_ADMIN_PAGE_IMPORTS = [
  ...PRIME_FORM_IMPORTS,
  ...PRIME_DATA_IMPORTS
] as const;
