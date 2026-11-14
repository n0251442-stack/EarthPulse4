import React, { useState } from 'react';
import { StoryId, ViewMode } from '../types';
import { STORIES } from '../data/earthData';
import { useAccessibility } from '../context/AccessibilityContext';
import { Thermometer, Waves, Flame, Compass, ArrowRight, ExternalLink, Clock } from 'lucide-react';

import earthThermalImg from '../assets/images/earth_thermal_anomaly_1794384319112.jpg';
import oceanSeaIceImg from '../assets/images/ocean_sea_ice_1794384335334.jpg';
import wildfireImg from '../assets/images/wildfire_thermal_1794384349564.jpg';
import cosmosEarthImg from '../assets/images/cosmos_blue_earth_1794384362943.jpg';

interface StoriesLabProps {
  onSelectStory: (storyId: StoryId) => void;
  onNavigate: (view: ViewMode) => void;
}

const STORY_IMAGES: Record<StoryId, string> = {
  temperature: earthThermalImg,
  oceans: oceanSeaIceImg,
  wildfires: wildfireImg,
  carbon: cosmosEarthImg,
};

export const StoriesLab: React.FC<StoriesLabProps> = ({
  onSelectStory,
  onNavigate,
}) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const [selectedStoryId, setSelectedStoryId] = useState<StoryId>('temperature');

  const selectedStory =
    STORIES.find((s) => s.id === selectedStoryId) || STORIES[0];

  const getStoryIcon = (id: StoryId) => {
    switch (id) {
      case 'temperature':
        return <Thermometer className="w-5 h-5 text-cyan-400" />;
      case 'oceans':
        return <Waves className="w-5 h-5 text-sky-400" />;
      case 'wildfires':
        return <Flame className="w-5 h-5 text-amber-500" />;
      case 'carbon':
        return <Compass className="w-5 h-5 text-emerald-400" />;
    }
  };

  const handleSelectStory = (id: StoryId) => {
    setSelectedStoryId(id);
    const story = STORIES.find((s) => s.id === id);
    if (story) {
      announceToScreenReader(`Selected story: ${story.title}. ${story.subtitle}`);
    }
  };

  const handleLaunchDashboard = () => {
    if (selectedStory.isComingSoon) {
      announceToScreenReader(
        `${selectedStory.title} lab is currently under scientific development and coming soon.`
      );
      return;
    }
    onSelectStory(selectedStoryId);
    onNavigate('dashboard');
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <h1
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 ${
            settings.highContrast ? 'text-white' : 'text-white'
          }`}
        >
          Earth Stories Lab
        </h1>
        <p
          className={`text-base sm:text-lg ${
            settings.highContrast ? 'text-slate-200' : 'text-slate-300/90'
          }`}
        >
          Choose a scientific story to explore its data visualization, sonification,
          and planetary changes.
        </p>
      </div>

      {/* 4 Story Cards Grid with Authentic Scientific Imagery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {STORIES.map((story) => {
          const isSelected = selectedStoryId === story.id;
          return (
            <button
              key={story.id}
              onClick={() => handleSelectStory(story.id)}
              className={`group text-left rounded-2xl overflow-hidden border transition-all flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                settings.highContrast
                  ? isSelected
                    ? 'bg-black border-2 border-[#ffe600] shadow-[0_0_16px_#ffe600]'
                    : 'bg-black border border-slate-700 hover:border-[#ffe600]'
                  : isSelected
                  ? 'bg-cyan-950/20 border-2 border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.35)] scale-[1.02] backdrop-blur-sm'
                  : 'bg-transparent border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-950/15 backdrop-blur-sm'
              }`}
            >
              {/* Graphic Preview Visual */}
              <div className="h-44 w-full relative overflow-hidden bg-slate-950">
                <img
                  src={STORY_IMAGES[story.id]}
                  alt={story.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                {/* 'Soon' pill for stories without an active lab */}
                {story.isComingSoon && (
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-black/85 text-cyan-300 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.35)] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Soon</span>
                  </div>
                )}

                {/* Badge overlay for time range */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-black/70 text-slate-200 backdrop-blur-sm border border-white/15">
                  {story.timeRange}
                </div>
              </div>

              {/* Text Card Footer */}
              <div className="p-5 flex items-center justify-between">
                <div>
                  <h3
                    className={`font-bold text-base mb-1 ${
                      settings.highContrast
                        ? isSelected
                          ? 'text-[#ffe600]'
                          : 'text-white'
                        : isSelected
                        ? 'text-cyan-300'
                        : 'text-white'
                    }`}
                  >
                    {story.title}
                  </h3>
                  {story.isComingSoon ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                        Soon
                      </span>
                      <span
                        className={`text-xs truncate max-w-[150px] ${
                          settings.highContrast ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {story.subtitle}
                      </span>
                    </div>
                  ) : (
                    <p
                      className={`text-xs ${
                        settings.highContrast ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {story.subtitle}
                    </p>
                  )}
                </div>
                <div
                  className={`p-2 rounded-xl transition-colors ${
                    settings.highContrast
                      ? 'bg-[#ffe600] text-black'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}
                >
                  {getStoryIcon(story.id)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Featured Detailed Story Spotlight Banner */}
      <div
        className={`rounded-2xl border p-4 sm:p-8 transition-all ${
          settings.highContrast
            ? 'bg-black border-2 border-[#ffe600] text-white'
            : 'bg-transparent border-cyan-500/25 backdrop-blur-sm text-slate-100 hover:border-cyan-400/40'
        }`}
      >
        <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 lg:gap-8 items-center justify-between">
          {/* 1. Left: Story Preview Visual */}
          <div className="w-full lg:w-64 h-44 sm:h-48 rounded-xl overflow-hidden shrink-0 border border-cyan-500/30 relative shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <img
              src={STORY_IMAGES[selectedStory.id]}
              alt={selectedStory.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* 2. Middle: Story Description & Source (English) */}
          <div className="flex-1 min-w-0 space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {selectedStory.isComingSoon ? (
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Lab Coming Soon</span>
                </span>
              ) : (
                <span
                  className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded ${
                    settings.highContrast
                      ? 'bg-[#ffe600] text-black'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {selectedStory.badgeLabel}
                </span>
              )}
              <span className="text-xs font-mono text-slate-400">
                Baseline: {selectedStory.baseline}
              </span>
            </div>

            <h2
              className={`text-xl sm:text-3xl font-extrabold ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              {selectedStory.title}
            </h2>

            <p
              className={`text-sm sm:text-base leading-relaxed ${
                settings.highContrast ? 'text-slate-200' : 'text-slate-300'
              }`}
            >
              {selectedStory.description} {selectedStory.longDescription}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-slate-400 pt-1">
              <span>Suggested Source: {selectedStory.source}</span>
              <a
                href={selectedStory.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
              >
                <span>NASA Reference</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 3. Right: Audio Experience Launch Button Card */}
          <div className="w-full lg:w-72 flex flex-col items-center justify-center p-6 rounded-2xl border text-center space-y-3 bg-transparent border-cyan-500/25 shrink-0">
            {/* Animated Sound Wave Graphic */}
            <div className="mb-1 flex items-center justify-center gap-1.5 h-8 text-cyan-400">
              <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
              <span className="w-1.5 h-6 bg-cyan-400 rounded-full animate-pulse delay-75" />
              <span className="w-1.5 h-8 bg-cyan-400 rounded-full animate-pulse delay-150" />
              <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-pulse delay-100" />
              <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
            </div>

            <div>
              <h3
                className={`text-base font-bold mb-1 ${
                  settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                }`}
              >
                {selectedStory.isComingSoon
                  ? 'Lab In Development'
                  : 'Interactive Audio Experience'}
              </h3>
              <p
                className={`text-xs ${
                  settings.highContrast ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                {selectedStory.isComingSoon
                  ? 'Scientific sonification models and telemetry for this lab are coming soon.'
                  : 'Converts authentic NASA data into musical pitches and acoustic signals.'}
              </p>
            </div>

            {selectedStory.isComingSoon ? (
              <button
                disabled
                className="w-full mt-2 py-3 px-5 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 bg-slate-900/80 text-slate-400 border border-slate-700/60 cursor-not-allowed"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Lab Coming Soon</span>
              </button>
            ) : (
              <button
                onClick={handleLaunchDashboard}
                className={`w-full mt-2 py-3 px-5 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all ${
                  settings.highContrast
                    ? 'bg-[#ffe600] text-black hover:bg-yellow-300'
                    : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                }`}
              >
                <span>Explore in Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
