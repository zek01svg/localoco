import React from "react";
import { Star, User } from "lucide-react";
import { Review } from "../types/business";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface ReviewCardProps {
    review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${
                    i < rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                }`}
            />
        ));
    };

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage
                            src={review.userAvatar}
                            alt={review.userName}
                        />
                        <AvatarFallback className="bg-[#FFA1A3] text-white">
                            <User className="w-5 h-5" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm text-foreground">
                                {review.userName}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                                {new Date(review.date).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex mt-1">
                            {renderStars(review.rating)}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <p className="text-sm text-foreground">{review.comment}</p>
            </CardContent>
        </Card>
    );
}
