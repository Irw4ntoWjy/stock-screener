interface InfoRowProps {
	label: string;
	value: string | undefined;
	icon?: React.ReactNode;
	isLink?: boolean;
}

export const InfoRow = ({
	label,
	value,
	icon,
	isLink,
}: InfoRowProps) => {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<dt className="text-sm text-muted-foreground">{label}</dt>
			<dd className="text-sm font-medium flex items-start gap-2 break-words [overflow-wrap:anywhere]">
				{icon && (
					<span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
				)}
				{isLink && value ? (
					<a
						href={`https://${value}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						{value}
					</a>
				) : (
					value
				)}
			</dd>
		</div>
	);
};
