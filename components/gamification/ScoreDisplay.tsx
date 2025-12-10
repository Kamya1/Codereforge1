'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Flame, Award } from 'lucide-react';
import { useChallengeStore } from '@/store/useChallengeStore';
import { getBadgeName } from '@/lib/gamification/points-system';

export function ScoreDisplay() {
  const { userScore } = useChallengeStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Points</p>
            <p className="text-2xl font-bold">{userScore.totalPoints}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Level</p>
            <p className="text-2xl font-bold flex items-center gap-1">
              <Star className="w-5 h-5 text-yellow-500" />
              {userScore.level}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm">Streak: {userScore.streak} days</span>
        </div>
        
        {userScore.badges.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Badges
            </p>
            <div className="flex flex-wrap gap-2">
              {userScore.badges.map((badge) => (
                <span
                  key={badge}
                  className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full"
                >
                  {getBadgeName(badge)}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

