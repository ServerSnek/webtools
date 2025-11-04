"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

const wordsList = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
];

function generateWords(count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(wordsList[Math.floor(Math.random() * wordsList.length)]);
  }
  return words;
}

export default function TypingTest() {
  const router = useRouter();
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [duration, setDuration] = useState(30);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isComplete, setIsComplete] = useState(false);
  const [incorrectWords, setIncorrectWords] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reset();
  }, []);

  useEffect(() => {
    if (startTime && !isComplete && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [startTime, isComplete, timeLeft]);

  useEffect(() => {
    if (typedWords.length > 0 && startTime && !isComplete) {
      const timeElapsed = (Date.now() - startTime) / 1000 / 60;
      const wordsTyped = typedWords.length;
      const calculatedWpm = Math.round(wordsTyped / timeElapsed);
      setWpm(isFinite(calculatedWpm) ? calculatedWpm : 0);

      const correctWords = typedWords.filter((word, i) => word === words[i]).length;
      const calculatedAccuracy = Math.round((correctWords / typedWords.length) * 100);
      setAccuracy(calculatedAccuracy || 100);
    }
  }, [typedWords, startTime, isComplete, words]);

  const handleComplete = () => {
    setIsComplete(true);
  };

  const reset = (newDuration?: number) => {
    const durationToUse = newDuration ?? duration;
    const newWords = generateWords(200);
    setWords(newWords);
    setCurrentWordIndex(0);
    setCurrentInput("");
    setTypedWords([]);
    setStartTime(null);
    setTimeLeft(durationToUse);
    setWpm(0);
    setAccuracy(100);
    setIsComplete(false);
    setIncorrectWords(new Set());
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const changeDuration = (newDuration: number) => {
    setDuration(newDuration);
    reset(newDuration);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " && currentInput.trim()) {
      e.preventDefault();
      
      if (!startTime) {
        setStartTime(Date.now());
      }

      const isCorrect = currentInput.trim() === words[currentWordIndex];
      if (!isCorrect) {
        setIncorrectWords(prev => new Set([...prev, currentWordIndex]));
      }

      setTypedWords([...typedWords, currentInput.trim()]);
      setCurrentWordIndex(currentWordIndex + 1);
      setCurrentInput("");
    }
  };

  const getWordClass = (index: number) => {
    if (index < currentWordIndex) {
      return incorrectWords.has(index) ? "text-destructive" : "text-muted-foreground";
    }
    if (index === currentWordIndex) {
      return "text-primary";
    }
    return "text-muted-foreground/50";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value.includes(" ")) {
      setCurrentInput(value);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {isComplete ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
            <div className="text-center space-y-6">
              <div className="grid grid-cols-2 gap-12 mb-8">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">{wpm}</div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wider">WPM</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">{accuracy}%</div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wider">Accuracy</div>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button onClick={() => reset()} size="lg" data-testid="button-restart">
                  <RotateCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" size="lg" onClick={() => router.push("/")} data-testid="button-home">
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <div className="flex gap-1">
                    {[15, 30, 60, 120].map((time) => (
                      <button
                        key={time}
                        onClick={() => !startTime && changeDuration(time)}
                        className={`px-3 py-1 rounded transition-colors ${
                          duration === time
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        } ${startTime ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        disabled={!!startTime}
                        data-testid={`button-duration-${time}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-2xl font-bold text-primary" data-testid="text-wpm">
                  {wpm}
                </div>
                <div className="text-2xl font-bold text-primary tabular-nums" data-testid="text-time">
                  {timeLeft}
                </div>
              </div>
            </div>

            <div className="mb-8 max-w-4xl mx-auto">
              <div className="text-2xl leading-loose font-mono select-none mb-6" data-testid="text-words">
                {words.slice(0, 60).map((word, index) => (
                  <span key={index}>
                    <span className={`${getWordClass(index)} transition-colors`}>
                      {index === currentWordIndex && currentInput && (
                        <>
                          {word.split("").map((char, charIndex) => (
                            <span
                              key={charIndex}
                              className={
                                charIndex < currentInput.length
                                  ? currentInput[charIndex] === char
                                    ? "text-foreground"
                                    : "text-destructive"
                                  : ""
                              }
                            >
                              {char}
                            </span>
                          ))}
                          {currentInput.length > word.length && (
                            <span className="text-destructive">
                              {currentInput.slice(word.length)}
                            </span>
                          )}
                        </>
                      )}
                      {index !== currentWordIndex && word}
                      {index === currentWordIndex && !currentInput && (
                        <>
                          <span className="text-foreground animate-pulse">|</span>
                          {word}
                        </>
                      )}
                    </span>
                    {" "}
                  </span>
                ))}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="sr-only"
                autoFocus
                disabled={isComplete}
                data-testid="input-typing"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>

            <div className="text-center">
              <Button
                onClick={() => reset()}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-reset"
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
