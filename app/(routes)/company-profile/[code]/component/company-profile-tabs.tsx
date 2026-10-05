import { Separator } from '@/components/ui/separator';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import { CompanyProfileSchema } from '../company-profile-schema';
import { InfoRow } from './info-row';
import { getDirectorsTableColumn } from './directors-table-config';
import { DataTable } from '@/components/page/data-table';
import { getCommissionersTableColumn } from './commissioners-table-config';
import { getAuditCommitteeTableColumn } from './audit-committee-table-config';
import { getSubsidiariesTableColumn } from './subsidiaries-table-config';
import { getShareholdersTableColumn } from './shareholders-table-config';
import { dateFormatString } from '@/lib/utils';

interface CompanyProfileTabsProps {
	data: CompanyProfileSchema;
}

const SectionTitle = ({
	children,
}: {
	children: React.ReactNode;
}) => (
	<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
		<div className="h-5 w-1 bg-primary rounded-full" />
		{children}
	</h3>
);

const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<div>
		<SectionTitle>{title}</SectionTitle>
		{children}
		<Separator className="my-6" />
	</div>
);

const TableSection = ({
	title,
	columns,
	data,
}: {
	title: string;
	columns: any[];
	data: any[];
}) => (
	<Section title={title}>
		<DataTable columns={columns} data={data ?? []} />
	</Section>
);

export const CompanyProfileTabs = ({
	data,
}: CompanyProfileTabsProps) => {
	if (!data) {
		return (
			<div className="text-center py-10 text-muted-foreground">
				No company data available
			</div>
		);
	}

	const {
		companyProfile: profile,
		companySecretary: secretary,
		directors = [],
		commissioners = [],
		auditCommittee = [],
		subsidiaries = [],
		shareholders = [],
	} = data;

	const tableConfigs = {
		directors: getDirectorsTableColumn(),
		commissioners: getCommissionersTableColumn(),
		auditCommittee: getAuditCommitteeTableColumn(),
		subsidiaries: getSubsidiariesTableColumn(),
		shareholders: getShareholdersTableColumn(),
	};

	return (
		<>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
				<div className="space-y-6">
					<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
						<div className="h-5 w-1 bg-primary rounded-full" />
						Basic Information
					</h3>
					<div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-8 gap-y-4 text-sm">
						<InfoRow
							label="Company Name"
							value={profile.issuerName}
						/>
						<InfoRow
							label="Registration Date"
							value={
								profile.listingDate
									? dateFormatString(
											profile.listingDate.toString()
									  )
									: '-'
							}
						/>
						<InfoRow
							label="Stock Code"
							value={profile.issuerCode}
						/>
						<InfoRow
							label="Listing Board"
							value={profile.listingBoard}
						/>
						<InfoRow label="Sector" value={profile.sector} />
						<InfoRow
							label="Sub-sector"
							value={profile.subSector}
						/>
						<InfoRow label="Industry" value={profile.industry} />
						<InfoRow
							label="Sub-industry"
							value={profile.subIndustry}
						/>
					</div>
				</div>

				<div className="space-y-6">
					<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
						<div className="h-5 w-1 bg-primary rounded-full" />
						Contact Information
					</h3>

					<div className="space-y-5">
						<InfoRow
							label="Office Address"
							value={profile.address}
							icon={<MapPin className="size-4" />}
						/>

						<div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-8 gap-y-4 text-sm">
							<InfoRow
								label="Email"
								value={profile.email || ''}
								icon={<Mail className="size-4" />}
							/>
							<InfoRow
								label="Phone"
								value={profile.phone || ''}
								icon={<Phone className="size-4" />}
							/>
							<InfoRow label="Fax" value="021-23588300" />
							<InfoRow
								label="Website"
								value={profile.website || ''}
								icon={<Globe className="size-4 text-primary" />}
								isLink
							/>
							<InfoRow label="NPWP" value={profile.npwp || ''} />
						</div>
					</div>
				</div>
			</div>

			<Separator className="my-6" />

			<div>
				<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
					<div className="h-5 w-1 bg-primary rounded-full" />
					Corporate Secretary
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-4 max-w-4xl text-sm">
					<InfoRow label="Name" value={secretary?.name || ''} />
					<InfoRow
						label="Email"
						value={secretary?.email || ''}
					/>
					<InfoRow
						label="Phone"
						value={secretary?.phone || ''}
					/>
				</div>
			</div>

			<Separator className="my-6" />

			<TableSection
				title="Directors"
				columns={tableConfigs.directors}
				data={directors}
			/>
			<TableSection
				title="Commissioners"
				columns={tableConfigs.commissioners}
				data={commissioners}
			/>
			<TableSection
				title="Audit Committee"
				columns={tableConfigs.auditCommittee}
				data={auditCommittee}
			/>
			<TableSection
				title="Subsidiaries"
				columns={tableConfigs.subsidiaries}
				data={subsidiaries}
			/>
			<TableSection
				title="Shareholders"
				columns={tableConfigs.shareholders}
				data={shareholders}
			/>
		</>
	);
};
