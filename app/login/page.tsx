'use client';

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Key, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ForgotPasswordForm } from './component/ForgotPasswordForm';
import { LoginForm } from './component/LoginForm';
import { fetchForgotPassword } from './server/forgot-password';

export default function Login() {
	const userEmail = 'tuathanlui888@gmail.com';
	const [showOtpForm, setShowOtpForm] = useState(false);

	const handleForgotPassword = async (e: React.MouseEvent) => {
		e.preventDefault();

		const result = await fetchForgotPassword(userEmail);
		toast[result.success ? 'success' : 'error'](result.message);

		setShowOtpForm(true);
	};

	const handlePasswordResetSuccess = () => {
		setShowOtpForm(false);
		toast.success(
			'Password changed successfully! You can now log in.'
		);
	};

	return (
		<div className="flex min-h-full items-center justify-center py-4">
			<Card className="w-full max-w-md bg-white border-0 shadow-xl dark:border-gray-700 p-4 sm:p-8">
				<CardHeader className="space-y-1">
					<div className="flex justify-center gap-3 items-center">
						<TrendingUp className="size-7 sm:size-8 shrink-0 text-blue-500" />
						<CardTitle className="text-xl sm:text-2xl text-center text-black">
							IDX Stocks Screener
						</CardTitle>
					</div>
					<CardDescription className="text-center text-gray-400">
						Sign in to your account
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 px-0 py-4 sm:p-6">
					{showOtpForm ? (
						<ForgotPasswordForm
							email={userEmail}
							onResetSuccess={handlePasswordResetSuccess}
						/>
					) : (
						<>
							<LoginForm />
							<div className="text-center space-y-2 text-sm">
								<Link
									href="#"
									className="text-blue-500 underline-offset-4 hover:underline font-medium flex items-center justify-center gap-1"
									onClick={handleForgotPassword}
								>
									<Key className="h-3 w-3 inline" />
									Forgot password?
								</Link>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
