import { useSession } from "next-auth/react";
import Image from "next/image";
import { SquareArrowOutUpRightIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableInput } from "@/components/CopyableInput";

import { useApp } from "@/contexts/AppContext";
import { SetUpWithGoogleSheetsButton } from "@/app/TransactionsView/TransactionsView";

interface SheetsSetupBannerProps {
	isDemoWarningClosed: boolean;
}

export default function SheetsSetupBanner({ isDemoWarningClosed }: SheetsSetupBannerProps) {
	const { data: session } = useSession();
	const { spreadsheetId } = useApp();

	if (spreadsheetId || isDemoWarningClosed) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">{session ? "Google Sheets setup" : "Demo Mode"}</CardTitle>
			</CardHeader>

			<CardContent>
				<div className="prose flex flex-col items-center gap-4">
					{!session ? (
						<>
							<p className="text-center">
								You are in demo mode. <span className="font-bold">Data will not save.</span>
							</p>
							<p className="text-center">Set up with Google Sheets to store your transactions:</p>
							<SetUpWithGoogleSheetsButton />
						</>
					) : (
						<>
							<p className="text-muted-foreground">⚠️ Data will not save until setup is complete.</p>
							<p className="text-muted-foreground">
								❗️ Make sure you are signed in to the same Google Account across green and Sheets.
							</p>
							<div className="prose">
								<ol className="marker:text-muted-foreground list-inside list-decimal space-y-4">
									<li>
										Copy the email to share with:
										<code className="text-muted-foreground">
											<CopyableInput value="green-330@green-456901.iam.gserviceaccount.com" />
										</code>
									</li>
									<li>
										<a
											href="https://docs.google.com/spreadsheets/create"
											target="_blank"
											rel="noopener"
											className="inline-flex items-baseline"
										>
											<SquareArrowOutUpRightIcon size={18} className="self-center" />
											<span className="pl-1">Create a Sheet (and name it)</span>
										</a>
									</li>
									<li>
										Share it
										<div className="flex flex-col items-center">
											<Image src="/assets/sheets-setup-step-1.png" alt="Sheets Setup Step 1" width={600} height={600} />
											<Image src="/assets/sheets-setup-step-2.png" alt="Sheets Setup Step 2" width={300} height={300} />
										</div>
									</li>
									<li>Refresh this page 🎉</li>
								</ol>
							</div>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
