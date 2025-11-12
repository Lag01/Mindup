import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

    // Create deck and reviews in a transaction
    const deck = await prisma.$transaction(async (tx) => {
      // Create the deck with cards
      const createdDeck = await tx.deck.create({
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
      const reviewsData = createdDeck.cards.map(card => ({
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
        lastReview: newCardData.lastReview ?? undefined,
      }));

      await tx.review.createMany({
        data: reviewsData,
      });

      return createdDeck;
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

    // Identifier le type d'erreur pour donner un message plus précis
    let errorMessage = 'Erreur lors de l\'importation du deck';

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        errorMessage = 'Ce deck contient des cartes déjà importées';
      } else if (error.code === 'P2003') {
        errorMessage = 'Erreur de référence dans la base de données';
      } else {
        errorMessage = `Erreur de base de données : ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
