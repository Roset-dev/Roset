import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import react__default, { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { ClassValue } from 'clsx';

interface CalloutProps {
    type?: 'note' | 'warning' | 'danger' | 'info' | 'success';
    title?: string;
    children: react__default.ReactNode;
}
declare function Callout({ type, title, children }: CalloutProps): react_jsx_runtime.JSX.Element;

interface StepsProps {
    children: react__default.ReactNode;
}
declare function Steps({ children }: StepsProps): react_jsx_runtime.JSX.Element;
interface StepProps {
    title: string;
    children: react__default.ReactNode;
}
declare function Step({ title, children }: StepProps): react_jsx_runtime.JSX.Element;

interface TabsProps {
    items: string[];
    children: react__default.ReactNode;
}
declare function Tabs({ items, children }: TabsProps): react_jsx_runtime.JSX.Element;
interface TabProps {
    children: react__default.ReactNode;
}
declare function Tab({ children }: TabProps): react_jsx_runtime.JSX.Element;

interface CodeBlockCopyProps {
    code: string;
    language?: string;
}
declare function CodeBlockCopy({ code, language }: CodeBlockCopyProps): react_jsx_runtime.JSX.Element;

interface BadgeProps {
    children: ReactNode;
    variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
    size?: "sm" | "md" | "lg";
    className?: string;
}
declare function Badge({ children, variant, size, className, }: BadgeProps): react_jsx_runtime.JSX.Element;

interface SearchTriggerProps {
    onClick?: () => void;
    className?: string;
}
declare function SearchTrigger({ onClick, className }: SearchTriggerProps): react_jsx_runtime.JSX.Element;
declare function Search(): react_jsx_runtime.JSX.Element;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
}
declare const Button: react.ForwardRefExoticComponent<ButtonProps & react.RefAttributes<HTMLButtonElement>>;

interface CardProps {
    children: ReactNode;
    className?: string;
}
declare function Card({ children, className }: CardProps): react_jsx_runtime.JSX.Element;
interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}
declare function CardHeader({ children, className }: CardHeaderProps): react_jsx_runtime.JSX.Element;
interface CardTitleProps {
    children: ReactNode;
    className?: string;
}
declare function CardTitle({ children, className }: CardTitleProps): react_jsx_runtime.JSX.Element;
interface CardDescriptionProps {
    children: ReactNode;
    className?: string;
}
declare function CardDescription({ children, className, }: CardDescriptionProps): react_jsx_runtime.JSX.Element;
interface CardContentProps {
    children: ReactNode;
    className?: string;
}
declare function CardContent({ children, className }: CardContentProps): react_jsx_runtime.JSX.Element;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}
declare const Input: react.ForwardRefExoticComponent<InputProps & react.RefAttributes<HTMLInputElement>>;

interface AlertProps {
    children: ReactNode;
    variant?: "info" | "success" | "warning" | "error";
    title?: string;
    className?: string;
}
declare function Alert({ children, variant, title, className, }: AlertProps): react_jsx_runtime.JSX.Element;

interface DividerProps {
    label?: string;
    className?: string;
}
declare function Divider({ label, className }: DividerProps): react_jsx_runtime.JSX.Element;

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}
declare const Textarea: react.ForwardRefExoticComponent<TextareaProps & react.RefAttributes<HTMLTextAreaElement>>;

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}
interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
}
declare const Select: react.ForwardRefExoticComponent<SelectProps & react.RefAttributes<HTMLSelectElement>>;

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
    label?: string;
    description?: string;
    size?: "sm" | "md";
}
declare const Switch: react.ForwardRefExoticComponent<SwitchProps & react.RefAttributes<HTMLInputElement>>;

interface AvatarProps {
    src?: string;
    alt?: string;
    fallback?: string;
    size?: "sm" | "md" | "lg";
    status?: "online" | "away" | "busy" | "offline";
    className?: string;
}
declare function Avatar({ src, alt, fallback, size, status, className, }: AvatarProps): react_jsx_runtime.JSX.Element;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    children: ReactNode;
}
declare const IconButton: react.ForwardRefExoticComponent<IconButtonProps & react.RefAttributes<HTMLButtonElement>>;

interface SkeletonProps {
    className?: string;
    variant?: "text" | "circular" | "rectangular";
    width?: string | number;
    height?: string | number;
}
declare function Skeleton({ className, variant, width, height, }: SkeletonProps): react_jsx_runtime.JSX.Element;
declare function SkeletonCard(): react_jsx_runtime.JSX.Element;
declare function SkeletonAvatar({ size }: {
    size?: "sm" | "md" | "lg";
}): react_jsx_runtime.JSX.Element;
declare function SkeletonButton(): react_jsx_runtime.JSX.Element;

interface CodeBlockProps {
    code?: string;
    children?: React.ReactNode;
    language?: string;
    filename?: string;
}
declare function CodeBlock({ code, children, language, filename, }: CodeBlockProps): react_jsx_runtime.JSX.Element;

interface TableProps {
    children: ReactNode;
    className?: string;
}
declare function Table({ children, className }: TableProps): react_jsx_runtime.JSX.Element;
declare function TableHeader({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;
declare function TableBody({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;
declare function TableRow({ children, className, }: {
    children: ReactNode;
    className?: string;
}): react_jsx_runtime.JSX.Element;
declare function TableHead({ children, className, }: {
    children: ReactNode;
    className?: string;
}): react_jsx_runtime.JSX.Element;
declare function TableCell({ children, className, }: {
    children: ReactNode;
    className?: string;
}): react_jsx_runtime.JSX.Element;

interface StatCardProps {
    label: string;
    value: string | number;
    change?: {
        value: string | number;
        type: "increase" | "decrease" | "neutral";
    };
    icon?: ReactNode;
    className?: string;
}
declare function StatCard({ label, value, change, icon, className, }: StatCardProps): react_jsx_runtime.JSX.Element;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    description?: string;
    size?: "sm" | "md" | "lg";
}
declare function Modal({ isOpen, onClose, children, title, description, size, }: ModalProps): react_jsx_runtime.JSX.Element | null;
interface ModalFooterProps {
    children: ReactNode;
    className?: string;
}
declare function ModalFooter({ children, className }: ModalFooterProps): react_jsx_runtime.JSX.Element;

interface TooltipProps {
    children: ReactNode;
    content: string;
    side?: "top" | "bottom" | "left" | "right";
    delay?: number;
}
declare function Tooltip({ children, content, side, delay, }: TooltipProps): react_jsx_runtime.JSX.Element;

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string;
    description?: string;
    error?: string;
}
declare const Checkbox: react.ForwardRefExoticComponent<CheckboxProps & react.RefAttributes<HTMLInputElement>>;

interface RadioGroupProps {
    children: ReactNode;
    name: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    label?: string;
    error?: string;
    className?: string;
    orientation?: "horizontal" | "vertical";
}
declare function RadioGroup({ children, name, value, onChange, label, error, className, orientation, }: RadioGroupProps): react_jsx_runtime.JSX.Element;
interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string;
    description?: string;
    value: string;
}
declare const Radio: react.ForwardRefExoticComponent<RadioProps & react.RefAttributes<HTMLInputElement>>;

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}
declare function Spinner({ size, className }: SpinnerProps): react_jsx_runtime.JSX.Element;

interface ProgressProps {
    value: number;
    max?: number;
    variant?: "default" | "success" | "warning" | "error";
    showLabel?: boolean;
    size?: "sm" | "md";
    className?: string;
}
declare function Progress({ value, max, variant, showLabel, size, className, }: ProgressProps): react_jsx_runtime.JSX.Element;

interface AccordionItemProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}
declare function AccordionItem({ title, children, defaultOpen, }: AccordionItemProps): react_jsx_runtime.JSX.Element;
interface AccordionProps {
    children: ReactNode;
    className?: string;
}
declare function Accordion({ children, className }: AccordionProps): react_jsx_runtime.JSX.Element;

interface DropdownItem {
    label: string;
    onClick?: () => void;
    icon?: ReactNode;
    danger?: boolean;
    disabled?: boolean;
}
interface DropdownMenuProps {
    trigger: ReactNode;
    items: (DropdownItem | "separator")[];
    align?: "start" | "end";
}
declare function DropdownMenu({ trigger, items, align, }: DropdownMenuProps): react_jsx_runtime.JSX.Element;

interface PopoverProps {
    trigger: ReactNode;
    children: ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
}
declare function Popover({ trigger, children, side, align, }: PopoverProps): react_jsx_runtime.JSX.Element;

interface BreadcrumbItem {
    label: string;
    href?: string;
}
interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}
declare function Breadcrumb({ items, className }: BreadcrumbProps): react_jsx_runtime.JSX.Element;

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}
declare function Pagination({ currentPage, totalPages, onPageChange, className, }: PaginationProps): react_jsx_runtime.JSX.Element;

interface Toast {
    id: string;
    title: string;
    description?: string;
    variant: "success" | "error" | "warning" | "info";
    action?: {
        label: string;
        onClick: () => void;
    };
}
interface ToastContextType {
    toasts: Toast[];
    addToast: (props: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
}
declare function useToast(): ToastContextType;
declare function ToastProvider({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

interface Command {
    id: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    action: () => void;
    keywords?: string[];
    shortcut?: string;
}
interface CommandPaletteProps {
    commands: Command[];
    placeholder?: string;
}
declare function CommandPalette({ commands, placeholder, }: CommandPaletteProps): react_jsx_runtime.JSX.Element | null;
declare function useCommandPalette(): {
    open: () => void;
};

type Permission = "owner" | "editor" | "viewer" | "inherited";
type StorageProvider = "s3" | "r2" | "minio" | "local";
interface FileNode {
    id: string;
    name: string;
    type: "file" | "folder";
    children?: FileNode[];
    size?: string;
    modified?: string;
    expanded?: boolean;
    permission?: Permission;
    sharedWith?: string[];
    isPublicLink?: boolean;
    versions?: number;
    storageKey?: string;
    storageProvider?: StorageProvider;
    lastOperation?: {
        type: "upload" | "move" | "rename" | "share" | "delete" | "restore";
        timestamp: string;
    };
}
interface FileTreeProps {
    initialData: FileNode[];
    className?: string;
    showMetadata?: boolean;
    showActions?: boolean;
    onNodeSelect?: (node: FileNode) => void;
    onNodeMove?: (nodeId: string, targetId: string) => void;
}
declare function FileTree({ initialData, className, showMetadata, showActions, onNodeSelect, onNodeMove, }: FileTreeProps): react_jsx_runtime.JSX.Element;

interface Activity {
    id: string;
    actor: string;
    action: "move" | "delete" | "create" | "upload" | "authorize" | "restore" | "share" | "rename";
    target: string;
    timestamp: string;
}
interface ActivityLogProps {
    activities: Activity[];
    className?: string;
}
declare function ActivityLog({ activities, className }: ActivityLogProps): react_jsx_runtime.JSX.Element;

interface User {
    id: string;
    name: string;
    email: string;
    role: "viewer" | "editor" | "owner";
    avatar?: string;
    addedAt?: string;
}
interface ShareDialogProps {
    fileName: string;
    filePath?: string;
    initialUsers?: User[];
    onShare?: (email: string, role: User["role"]) => void;
}
declare function ShareDialog({ fileName, filePath, initialUsers }: ShareDialogProps): react_jsx_runtime.JSX.Element;

declare function ApiKeyManager(): react_jsx_runtime.JSX.Element;

interface ApiEndpointProps {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description?: string;
    auth?: 'required' | 'optional' | 'none';
    children?: react__default.ReactNode;
}
declare function ApiEndpoint({ method, path, description, auth, children }: ApiEndpointProps): react_jsx_runtime.JSX.Element;
interface Parameter {
    name: string;
    type: string;
    required?: boolean;
    description: string;
    default?: string;
}
interface ParameterTableProps {
    title?: string;
    type?: 'path' | 'query' | 'body' | 'header';
    params: Parameter[];
}
declare function ParameterTable({ title, type, params }: ParameterTableProps): react_jsx_runtime.JSX.Element;
interface ResponseExampleProps {
    status: number;
    description?: string;
    json: object;
}
declare function ResponseExample({ status, description, json }: ResponseExampleProps): react_jsx_runtime.JSX.Element;
interface RequestExampleProps {
    json: object;
}
declare function RequestExample({ json }: RequestExampleProps): react_jsx_runtime.JSX.Element;

declare function cn(...inputs: ClassValue[]): string;

export { Accordion, AccordionItem, ActivityLog, Alert, ApiEndpoint, ApiKeyManager, Avatar, Badge, Breadcrumb, Button, Callout, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, CodeBlock, CodeBlockCopy, CommandPalette, Divider, DropdownMenu, FileTree, IconButton, Input, Modal, ModalFooter, Pagination, ParameterTable, Popover, Progress, Radio, RadioGroup, RequestExample, ResponseExample, Search, SearchTrigger, Select, ShareDialog, Skeleton, SkeletonAvatar, SkeletonButton, SkeletonCard, Spinner, StatCard, Step, Steps, Switch, Tab, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, Textarea, ToastProvider, Tooltip, cn, useCommandPalette, useToast };
