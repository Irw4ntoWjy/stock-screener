'use client';

import { Button } from '@/components/ui/button';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs';
import { timeout } from '@/lib/utils';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import {
	CompanyProfileSchema,
	FinancialStatementsSchema,
} from '../company-profile-schema';
import { refetchNewestCompanyProfile } from '../server/fetch-company-profile';
import { fetchFinancialStatements } from '../server/fetch-financial-statements';
import { CompanyProfileTabs } from './company-profile-tabs';
import { FinancialStatementTabs } from './financial-statement-tabs';

type ProfileTab = 'company-profile' | 'financial-statement';

interface CompanyProfilePageProps {
	code: string;
	data: CompanyProfileSchema;
}

export default function CompanyProfilePage({
	code,
	data,
}: CompanyProfilePageProps) {
	const searchParams = useSearchParams();
	const openFrom = searchParams.get('from') || undefined;
	// set by a navbar notification: open this tab and highlight the statement
	const tabParam =
		searchParams.get('tab') === 'financial-statement'
			? 'financial-statement'
			: 'company-profile';
	const highlightId = searchParams.get('statement') || undefined;
	const router = useRouter();

	const [tab, setTab] = useState<ProfileTab>(tabParam);
	const [financialData, setFinancialData] = useState<
		FinancialStatementsSchema[]
	>([]);
	const [isPending, startTransition] = useTransition();

	// a notification can lead here while this page is already open, so follow
	// the URL rather than only the first render
	useEffect(() => {
		handleOnTabChange(tabParam);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [code, tabParam, highlightId]);

	function handleOnTabChange(value: ProfileTab) {
		setTab(value);
		if (value === 'financial-statement') {
			startTransition(async () => {
				const response = await fetchFinancialStatements(code);
				await timeout(1000);

				setFinancialData(response);
			});
		} else {
			setFinancialData([]);
		}
	}

	const [isRefreshing, transition] = useTransition();
	const handleRefetch = () => {
		transition(async () => {
			await refetchNewestCompanyProfile(code);
			router.refresh();
		});
	};

	return (
		<div className="bg-card w-full min-h-full border border-t-0 rounded-b-lg px-3 py-3 sm:px-4 sm:py-4">
			<div className="mb-3 flex flex-wrap items-end justify-between gap-3">
				<div>
					<div className="flex items-center gap-3">
						{openFrom ? (
							<ArrowLeft
								className="size-5 text-muted-foreground cursor-pointer"
								onClick={() => router.back()}
							/>
						) : (
							<></>
						)}

						<div className="flex items-center gap-3">
							<div className="h-7 w-1 shrink-0 bg-primary rounded-full" />
							<h2 className="text-xl sm:text-2xl font-semibold leading-none">
								Company Information
							</h2>
						</div>
					</div>

					<p className="text-sm sm:text-base text-muted-foreground mt-2">
						Detailed company profile and corporate information
						for IDX listed companies
					</p>
				</div>
				<Button
					onClick={handleRefetch}
					disabled={isRefreshing}
					className="w-full sm:w-auto"
				>
					<RefreshCcw
						className={isRefreshing ? 'animate-spin' : ''}
					/>
					{isRefreshing
						? 'Refreshing...'
						: 'Refetch Newest Data'}
				</Button>
			</div>

			{/* scrolls on its own on desktop; on phones it flows with the page.
			    A plain div, not Radix ScrollArea: its display: table viewport
			    stops the wide tables below from scrolling sideways */}
			<div className="w-full rounded-md border border-border p-3 sm:p-4 lg:h-[calc(100dvh-14rem)] lg:min-h-[360px] lg:overflow-y-auto">
					{data && data.companyProfile && (
						<>
							<div className="flex items-center gap-3 sm:items-start sm:gap-4">
								<div className="size-20 sm:size-32 shrink-0 rounded-lg bg-white flex items-center justify-center p-2">
									<img
										src={`https://www.idx.co.id/${data.companyProfile.logo}`}
										alt={`${data.companyProfile.issuerName} Logo`}
										width={108}
										height={108}
										className="object-contain max-w-full max-h-full"
									/>
								</div>

								<div className="flex min-w-0 flex-col justify-center sm:min-h-[128px]">
									<span className="text-lg sm:text-2xl font-bold break-words">
										{data.companyProfile.issuerName}
									</span>
									<p className="text-sm text-muted-foreground mt-1">
										• IDX Listed Company
									</p>
								</div>
							</div>

							<div className="w-full border-b py-2"></div>
						</>
					)}

					<div>
						<Tabs
							onValueChange={(value) =>
								handleOnTabChange(value as ProfileTab)
							}
							value={tab}
							className="w-full mt-4"
						>
							<TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-4 sm:gap-6 overflow-x-auto">
								<TabsTrigger
									value="company-profile"
									className="rounded-none cursor-pointer border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3"
								>
									Company Profile
								</TabsTrigger>
								<TabsTrigger
									value="financial-statement"
									className="rounded-none  cursor-pointer border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3"
								>
									Financial Statements
								</TabsTrigger>
							</TabsList>

							<TabsContent
								value="company-profile"
								className="space-y-6 mt-4"
							>
								<CompanyProfileTabs data={data} />
							</TabsContent>

							<TabsContent
								value="financial-statement"
								className="mt-6"
							>
								{isPending ? (
									<div className="space-y-4">
										<div className="h-6 w-48 bg-muted animate-pulse rounded-md"></div>

										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
											{Array.from({ length: 6 }).map((_, i) => (
												<div
													key={i}
													className="h-40 w-full bg-muted animate-pulse rounded-xl"
												></div>
											))}
										</div>
									</div>
								) : (
									<FinancialStatementTabs
										data={financialData}
										highlightId={highlightId}
									/>
								)}
							</TabsContent>
						</Tabs>
					</div>
			</div>
		</div>
	);
}
