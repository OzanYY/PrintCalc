import { Separator } from "@/components/ui/separator"

interface SeparatorWithTextProps {
    text: string;
    className?: string;
}

export default function SeparatorWithText({ text, className = "" }: SeparatorWithTextProps) {
    return (
        <div className={`relative flex items-center ${className}`}>
            <Separator className="flex-1" />
            <span className="mx-4 text-xs text-muted-foreground whitespace-nowrap">
                {text}
            </span>
            <Separator className="flex-1" />
        </div>
    );
}