import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { parseXML, parseCSV } from '@/lib/parsers';
import { createNewCard } from '@/lib/fsrs';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    const content = await file.text();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    let parsedDeck;

    try {
      if (fileExtension === 'xml') {
        parsedDeck = parseXML(content);
      } else if (fileExtension === 'csv') {
        parsedDeck = await parseCSV(content);
      } else {
        return NextResponse.json(
          { error: 'Format de fichier non supporté. Utilisez .xml ou .csv' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Erreur de parsing : ${error.message}` },
        { status: 400 }
      );
    }

    // Create deck in database
    const deck = await prisma.deck.create({
      data: {
        name: parsedDeck.name,
        userId: user.id,
        cards: {
          create: parsedDeck.cards.map((card, index) => ({
            front: card.front,
            back: card.back,
            order: index,
          })),
        },
      },
      include: {
        cards: true,
      },
    });

    // Create initial reviews for all cards
    const newCardData = createNewCard();
    const reviewsData = deck.cards.map(card => ({
      cardId: card.id,
      userId: user.id,
      due: newCardData.due,
      stability: newCardData.stability,
      difficulty: newCardData.difficulty,
      elapsedDays: newCardData.elapsedDays,
      scheduledDays: newCardData.scheduledDays,
      learningSteps: newCardData.learningSteps,
      reps: newCardData.reps,
      lapses: newCardData.lapses,
      state: newCardData.state,
      lastReview: newCardData.lastReview,
    }));

    await prisma.review.createMany({
      data: reviewsData,
    });

    return NextResponse.json({
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        cardsCount: deck.cards.length,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'importation du deck' },
      { status: 500 }
    );
  }
}
