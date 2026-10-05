'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
	fetchForgotPassword,
	resetPassword,
	verifyForgotPasswordOTP,
} from '../server/forgot-password';

type ForgotPasswordFormProps = {
	email: string;
	onResetSuccess?: () => void;
};

export const ForgotPasswordForm = ({
	email,
	onResetSuccess,
}: ForgotPasswordFormProps) => {
	const [otp, setOtp] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [currentForm, setCurrentForm] = useState<
		'otp' | 'reset'
	>('otp');
	const [token, setToken] = useState<string | undefined>(
		undefined
	);
	const [disableResend, setDisableResend] = useState(false);

	// Reset password state
	const [newPassword, setNewPassword] = useState('');
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showConfirmPassword, setShowConfirmPassword] =
		useState(false);

	const handleResendPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setDisableResend(true);

		const result = await fetchForgotPassword(email);
		toast[result.success ? 'success' : 'error'](result.message);
	};

	const handleVerifyOTP = async (e: React.FormEvent) => {
		e.preventDefault();
		if (otp.length !== 6) {
			return toast.error('Enter a valid 6-digit code');
		}

		setLoading(true);
		const result = await verifyForgotPasswordOTP(email, otp);
		setLoading(false);

		if (result.success) {
			setToken(result.token);
			document.cookie = `reset-pw-token=${
				result.token
			}; Max-Age=${60 * 10}; Path=/; SameSite=Strict; ${
				process.env.NODE_ENV === 'production' ? 'Secure;' : ''
			}`;

			toast.success('OTP verified successfully!');
			setCurrentForm('reset');
		} else {
			toast.error(result.message ?? 'Invalid or expired OTP');
		}
	};

	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();

		setLoading(true);
		const result = await resetPassword(token!, newPassword);
		setLoading(false);

		if (result.success) {
			// remove reset-pw-token
			document.cookie =
				'reset-pw-token=; Max-Age=0; Path=/; SameSite=Strict';
			setNewPassword('');
			setConfirmPassword('');

			onResetSuccess?.();
		} else {
			toast.error(result.message ?? 'Failed to reset password');
		}
	};

	return (
		<>
			{currentForm === 'otp' ? (
				<form onSubmit={handleVerifyOTP} className="space-y-6">
					<div className="flex flex-col items-center space-y-6 w-full">
						<div className="flex flex-col items-center space-y-2 max-w-sm w-full">
							<Label className="text-lg text-center">
								Enter 6-digit code
							</Label>
							<p className="text-sm text-muted-foreground text-center px-4">
								We sent a verification code to{' '}
								<span className="font-medium break-all">{email}</span>
							</p>
						</div>

						<InputOTP
							maxLength={6}
							value={otp}
							onChange={(v) => setOtp(v)}
							disabled={loading}
							className="flex justify-center"
						>
							<InputOTPGroup>
								{[0, 1, 2, 3, 4, 5].map((i) => (
									<InputOTPSlot key={i} index={i} />
								))}
							</InputOTPGroup>
						</InputOTP>

						{!disableResend && (
							<p className="text-sm text-center text-muted-foreground max-w-sm">
								Didn't receive it?{' '}
								<button
									type="button"
									className="font-medium text-blue-500 hover:underline cursor-pointer"
									disabled={disableResend}
									onClick={handleResendPassword}
								>
									Resend
								</button>
							</p>
						)}
					</div>

					<Button
						type="submit"
						className="w-full"
						disabled={otp.length !== 6 || loading}
					>
						{loading ? 'Verifying...' : 'Verify Code'}
					</Button>
				</form>
			) : (
				<form
					onSubmit={handleResetPassword}
					className="space-y-6"
				>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="new-password">New Password</Label>
							<div className="relative">
								<Input
									id="new-password"
									type={showNewPassword ? 'text' : 'password'}
									value={newPassword}
									onChange={(e) =>
										setNewPassword(e.target.value)
									}
									placeholder="Enter new password"
									required
									disabled={loading}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowNewPassword((v) => !v)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
									aria-label={
										showNewPassword
											? 'Hide password'
											: 'Show password'
									}
								>
									{showNewPassword ? (
										<Eye className="size-4" />
									) : (
										<EyeOff className="size-4" />
									)}
								</button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirm-password">
								Confirm Password
							</Label>
							<div className="relative">
								<Input
									id="confirm-password"
									type={
										showConfirmPassword ? 'text' : 'password'
									}
									value={confirmPassword}
									onChange={(e) =>
										setConfirmPassword(e.target.value)
									}
									placeholder="Confirm new password"
									required
									disabled={loading}
									className={`pr-10 ${
										confirmPassword &&
										newPassword !== confirmPassword
											? 'border-red-500 focus-visible:ring-red-500'
											: confirmPassword &&
											  newPassword === confirmPassword
											? 'border-green-500 focus-visible:ring-green-500'
											: ''
									}`}
								/>
								<button
									type="button"
									onClick={() =>
										setShowConfirmPassword((v) => !v)
									}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
									aria-label={
										showConfirmPassword
											? 'Hide password'
											: 'Show password'
									}
								>{showConfirmPassword ? (
										<Eye className="size-4" />
									) : (
										<EyeOff className="size-4" />
									)}
								</button>
							</div>

							{confirmPassword && (
								<div className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-1">
									{newPassword === confirmPassword ? (
										<>
											<svg
												className="w-4 h-4 text-green-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
											<span className="text-green-600 font-medium">
												Passwords match
											</span>
										</>
									) : (
										<>
											<svg
												className="w-4 h-4 text-red-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
											<span className="text-red-600 font-medium">
												Passwords do not match
											</span>
										</>
									)}
								</div>
							)}
						</div>
					</div>

					<Button
						type="submit"
						className="w-full"
						disabled={loading}
					>
						{loading ? 'Resetting...' : 'Reset Password'}
					</Button>
				</form>
			)}
		</>
	);
};
