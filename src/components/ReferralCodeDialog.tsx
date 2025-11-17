import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Gift } from "lucide-react";

interface ReferralCodeDialogProps {
    open: boolean;
    onSubmit: (referralCode: string) => void;
    onSkip: () => void;
    initialCode?: string;
}

export function ReferralCodeDialog({
    open,
    onSubmit,
    onSkip,
    initialCode = "",
}: ReferralCodeDialogProps) {
    const [referralCode, setReferralCode] = useState(initialCode);

    console.log(
        "🎁 ReferralCodeDialog render - open:",
        open,
        "initialCode:",
        initialCode,
    );

    // Update referralCode when initialCode changes (from URL ref parameter)
    useEffect(() => {
        if (initialCode) {
            setReferralCode(initialCode);
            console.log("🔗 Auto-filled referral code from URL:", initialCode);
        }
    }, [initialCode]);

    const handleSubmit = () => {
        if (referralCode.trim()) {
            onSubmit(referralCode.trim().toUpperCase());
        } else {
            onSkip();
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                // Prevent closing by clicking outside - user must choose to skip or submit
                if (!isOpen) {
                    onSkip();
                }
            }}
        >
            <DialogContent
                className="sm:max-w-md"
                onEscapeKeyDown={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                        <Gift className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center">
                        Do you have a referral code?
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Enter a friend's referral code to get bonus rewards!
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="referralCode">Referral Code</Label>
                        <Input
                            id="referralCode"
                            type="text"
                            placeholder="e.g. AB12CD34"
                            value={referralCode}
                            onChange={(e) =>
                                setReferralCode(e.target.value.toUpperCase())
                            }
                            className="uppercase tracking-wider"
                            maxLength={32}
                            autoFocus
                        />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                        <p className="text-xs text-muted-foreground">
                            💡 Both you and your friend will receive $5 vouchers
                            when you enter their code!
                        </p>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center gap-2">
                    <Button type="button" variant="outline" onClick={onSkip}>
                        Skip for now
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {referralCode.trim() ? "Apply Code" : "Continue"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
