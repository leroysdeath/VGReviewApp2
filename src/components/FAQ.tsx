import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What isa GameVault?",
    answer: "GameVault is your personal hub for tracking, reviewing, and discovering video games. Log the games you've played, share your thoughts through reviews, and connect with a community of fellow gamers."
  },
  {
    question: "Who is GameVault for?",
    answer: "Whether you're a casual gamer, a console veteran, or a PC completionist—GameVault is built for everyone who enjoys video games and want's to share their thoughts and experiences with the gaming community"
  },
  {
    question: "Do I need an account to use GameVault?",
    answer: "Yes, creating an account is free and gives you access to all features, including logging games, writing reviews, and interacting with the community."
  },
  {
    question: "How do I log a game I've played?",
    answer: "Once you're logged in, just search for a game using the search bar, go to its page, and click \"Write Review\" to share your thoughts and experience while playing the game. Answering the question \"Did you finish the game?\" also logs the game as started or finished for your gaming activity."
  },
  {
    question: "How do I choose my Top 5?",
    answer: "Once you have a profile created while logged in, click the \"Top 5\" option. Click on any of the 5 spaces to choose from games you've already reviewed to be chosen as your own personal favorites. Once chosen, feel free to move them around to your liking with the \"Edit\" button. Remember, you can only choose from games you've already reviewed."
  },
  {
    question: "Can I write and share reviews?",
    answer: "Absolutely. After logging a game, you can submit a detailed review and rating. Your reviews may appear on the game's page and will appear on your profile, helping others discover great titles."
  },
  {
    question: "How do I find games on Game Vault?",
    answer: "Use the \"Explore Games\" button on the home page or the search bar at the top. The possibilities aren't endless, but just two!"
  },
  {
    question: "Can I update or delete my logs and reviews?",
    answer: "Visit your profile, find the review you'd like to change, and click \"Edit Review\". Alternatively, if you go to that game's game page, you can click \"Edit Review\". This will open a pop-up like the one you filled out when entering your review. Here you can make any changes you'd like, or delete your review. To save any changes, click \"Update Review\" in the lower right. To delete a review, click the red trash can button in the lower left."
  },
  {
    question: "Can I connect with other users? How do I follow someone?",
    answer: "Yes! You can follow other players to keep up with their game activity and reviews, and engage with the community through comments and likes. Once you are on a user's profile that you would like to follow, click the \"Follow\" button next to their profile picture and it should display \"Following\" afterwards."
  },
  {
    question: "Is GameVault available as a mobile app?",
    answer: "Not currently—but the website is fully responsive and works smoothly on both desktop and mobile browsers."
  },
  {
    question: "How can I report a bug or suggest a new feature?",
    answer: "We'd love your feedback! Please reach out to your Alpha Test contact to report issues, suggest features, or ask questions."
  }
];

export const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-lg">
            Find answers to common questions about Game Vault
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openItems.includes(index);
            
            return (
              <div 
                key={index} 
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-white pr-4">
                    {item.question}
                  </h3>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                {isOpen && (
                  <div className="px-6 pb-4">
                    <div className="border-t border-gray-700 pt-4">
                      <p className="text-gray-300 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">
            Still have questions?
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
};