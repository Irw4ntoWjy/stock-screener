import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Check, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { postNewMaConfig } from '../server/fetch-technical-data';

type PageProps = {
	maConfig: number[];
};

const labels = ['MA 1', 'MA 2', 'MA 3'];
const placeholders = ['e.g. 9', 'e.g. 50', 'e.g. 200'];

export const MaSettingsPopover = ({ maConfig }: PageProps) => {
	const [open, setOpen] = useState(false);
	const [temp, setTemp] = useState<number[]>(maConfig);

	// Sync temp values with applied when popover opens
	useEffect(() => {
		if (open) {
			setTemp(maConfig);
		}
	}, [open, maConfig]);

	const hasChanges =
		temp[0] !== maConfig[0] ||
		temp[1] !== maConfig[1] ||
		temp[2] !== maConfig[2];

	const handleApply = async () => {
		const jobId = crypto.randomUUID();

		const eSource = new EventSource(
			`${process.env.NEXT_PUBLIC_IDX_STOCK_SCREENER}/stocks-screener/moving-average/ma-config-sse?jobId=${jobId}`
		);

		eSource.addEventListener('open', () => {
			toast.success(
				'Please wait 5-10 minutes and the data will automatically update'
			);
			setOpen(false);
		});

		eSource.addEventListener('DONE', () => {
			toast.success('Moving Average Change Successfull');
			window.location.reload();

			eSource.close();
		});

		eSource.addEventListener('ERROR', () => {
			eSource.close();
		});

		eSource.onerror = (err) => {
			eSource.close();
		};

		await postNewMaConfig(jobId, temp);
		toast.success(
			'The process is ongoing, data will be updated automatically in 5-15 minutes.'
		);
		setOpen(false);
	};

	const handleReset = () => {
		setTemp([...maConfig]);
	};

	const handleValueChange = (index: number, value: string) => {
		const num = Math.max(1, parseInt(value) || 1);
		setTemp((prev) => {
			const next = [...prev];
			next[index] = num;
			return next;
		});
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					title="MA Settings"
					className="shrink-0 gap-2 bg-border hover:bg-ring text-foreground transition-colors"
				>
					<Settings2 className="size-4" />
					<span className="hidden sm:inline">MA Settings</span>
				</Button>
			</PopoverTrigger>

			<PopoverContent
				className="w-56 p-5 bg-card border-border"
				align="end"
			>
				<div className="space-y-5">
					<div className="flex items-center justify-between">
						<h4 className="font-semibold text-foreground">
							Moving Average Periods
						</h4>
					</div>

					<div className="space-y-4">
						{[0, 1, 2].map((index) => (
							<div
								key={index}
								className="flex items-center justify-between gap-4"
							>
								<Label className="text-sm font-medium text-muted-foreground w-24 text-right">
									{labels[index]}
								</Label>
								<Input
									type="number"
									min="1"
									max="9999"
									value={temp[index]}
									onChange={(e) =>
										handleValueChange(index, e.target.value)
									}
									placeholder={placeholders[index]}
									className="w-20 h-9 text-center font-medium bg-muted/50 focus:bg-muted"
								/>
							</div>
						))}
					</div>

					<div className="flex justify-end gap-2 pt-2 border-t border-border/50">
						{hasChanges && (
							<Button
								size="sm"
								onClick={handleReset}
								variant="outline"
								className="bg-muted text-foreground"
							>
								Reset
							</Button>
						)}
						<Button
							size="sm"
							onClick={handleApply}
							disabled={!hasChanges}
							className="gap-1.5"
						>
							<Check className="size-3.5" />
							Apply
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};
