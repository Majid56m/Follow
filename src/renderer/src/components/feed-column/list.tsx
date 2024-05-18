import { useSubscriptions } from "@renderer/lib/queries/subscriptions"
import {
  Collapsible,
  CollapsibleTrigger,
} from "@renderer/components/ui/collapsible"
import { m, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { levels, views } from "@renderer/lib/constants"
import { ActivedList, SubscriptionResponse } from "@renderer/lib/types"
import { cn } from "@renderer/lib/utils"
import { Response as SubscriptionsResponse } from "@renderer/lib/queries/subscriptions"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@renderer/components/ui/tooltip"
import { FeedIcon } from "@renderer/components/feed-icon"
import dayjs from "@renderer/lib/dayjs"
import { showNativeMenu } from "@renderer/lib/native-menu"
import { client } from "@renderer/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@renderer/lib/queries/api-fetch"
import { CategoryRenameDialog } from "./category-rename-dialog"
import { Dialog } from "../ui/dialog"

export function FeedList({
  className,
  view,
  activedList,
  setActivedList,
  hideTitle,
}: {
  className?: string
  view?: number
  activedList?: ActivedList
  setActivedList?: (value: ActivedList) => void
  hideTitle?: boolean
}) {
  const subscriptions = useSubscriptions(view)
  const [expansion, setExpansion] = useState(false)

  return (
    <div className={className}>
      {!hideTitle && (
        <div
          className={cn("flex items-center justify-between mb-2 px-2.5 py-1")}
        >
          <div className="font-bold">
            {view !== undefined && views[view].name}
          </div>
          <div className="text-sm text-zinc-500 ml-2 flex items-center gap-3">
            {expansion ? (
              <i
                className="i-mingcute-list-collapse-fill"
                onClick={() => setExpansion(false)}
              />
            ) : (
              <i
                className="i-mingcute-list-expansion-fill"
                onClick={() => setExpansion(true)}
              />
            )}
            <span>{subscriptions.data?.unread}</span>
          </div>
        </div>
      )}
      {subscriptions.data?.list.map((category) => (
        <FeedCategory
          key={category.name}
          data={category}
          activedList={activedList}
          setActivedList={setActivedList}
          view={view}
          expansion={expansion}
        />
      ))}
    </div>
  )
}

function FeedCategory({
  data,
  activedList,
  setActivedList,
  view,
  expansion,
}: {
  data: SubscriptionsResponse["list"][number]
  activedList?: ActivedList
  setActivedList?: (value: ActivedList) => void
  view?: number
  expansion: boolean
}) {
  const [open, setOpen] = useState(!data.name)
  const [dialogOpen, setDialogOpen] = useState(false)

  const queryClient = useQueryClient()
  const feedIdList = data.list.map((feed) => feed.feedId)
  const deleteMutation = useMutation({
    mutationFn: async () =>
      apiFetch("/categories", {
        method: "DELETE",
        body: {
          feedIdList,
          deleteSubscriptions: false,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", view],
      })
    },
  })

  const setFeedActive = (feed: SubscriptionResponse[number]) => {
    view !== undefined &&
      setActivedList?.({
        level: levels.feed,
        id: feed.feedId,
        name: feed.feeds.title || "",
        view,
      })
  }

  useEffect(() => {
    if (data.name) {
      setOpen(expansion)
    }
  }, [expansion])

  const setCatrgoryActive = () => {
    view !== undefined &&
      setActivedList?.({
        level: levels.folder,
        id: data.list.map((feed) => feed.feedId).join(","),
        name: data.name,
        view,
      })
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={(o) => setOpen(o)}
      onClick={(e) => e.stopPropagation()}
    >
      {!!data.name && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <div
            className={cn(
              "flex items-center justify-between font-medium text-sm leading-loose px-2.5 py-[2px] rounded-md w-full transition-colors",
              activedList?.level === levels.folder &&
                activedList.name === data.name &&
                "bg-[#C9C9C7]",
            )}
            onClick={(e) => {
              e.stopPropagation()
              setCatrgoryActive()
            }}
            onContextMenu={(e) => {
              showNativeMenu(
                [
                  {
                    type: "text",
                    label: "Rename Category",
                    click: () => setDialogOpen(true),
                  },
                  {
                    type: "text",
                    label: "Delete Category",
                    click: async () => {
                      if (
                        await client.showConfirmDialog({
                          title: `Delete Category ${data.name}?`,
                          message: `This operation will delete your category, but the feeds it contains will be retained and grouped by website.`,
                          options: {
                            buttons: ["Delete", "Cancel"],
                          },
                        })
                      ) {
                        deleteMutation.mutate()
                      }
                    },
                  },
                ],
                e,
              )
            }}
          >
            <div className="flex items-center min-w-0 w-full">
              <CollapsibleTrigger
                className={cn(
                  "flex items-center h-7 [&_.i-mingcute-right-fill]:data-[state=open]:rotate-90",
                  !setActivedList && "flex-1",
                )}
              >
                <i className="i-mingcute-right-fill mr-2 transition-transform" />
                {!setActivedList && (
                  <span className="truncate">{data.name}</span>
                )}
              </CollapsibleTrigger>
              {setActivedList && <span className="truncate">{data.name}</span>}
            </div>
            {!!data.unread && (
              <div className="text-xs text-zinc-500 ml-2">{data.unread}</div>
            )}
            <CategoryRenameDialog
              feedIdList={feedIdList}
              view={view}
              category={data.name}
              onSuccess={() => setDialogOpen(false)}
            />
          </div>
        </Dialog>
      )}
      <AnimatePresence>
        {open && (
          <m.div
            className="overflow-hidden"
            initial={
              !!data.name && {
                height: 0,
                opacity: 0.01,
              }
            }
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0.01,
            }}
          >
            {data.list.map((feed) => (
              <div
                className={cn(
                  "flex items-center justify-between text-sm font-medium leading-loose w-full pr-2.5 py-[2px] rounded-md",
                  activedList?.level === levels.feed &&
                    activedList.id === feed.feedId &&
                    "bg-[#C9C9C7]",
                  !!data.name ? "pl-6" : "pl-2.5",
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setFeedActive(feed)
                }}
                onContextMenu={(e) => {
                  showNativeMenu(
                    [
                      {
                        type: "text",
                        label: "Edit",
                        click: async () => {},
                      },
                      {
                        type: "text",
                        label: "Unfollow",
                        click: async () => {},
                      },
                      {
                        type: "separator",
                      },
                      {
                        type: "text",
                        label: "Open Feed in Browser",
                        click: async () => {},
                      },
                      {
                        type: "text",
                        label: "Open Site in Browser",
                        click: () => window.open(feed.feeds.siteUrl),
                      },
                    ],
                    e,
                  )
                }}
              >
                <div
                  className={cn(
                    "flex items-center min-w-0",
                    feed.feeds.errorAt && "text-red-900",
                  )}
                >
                  <FeedIcon feed={feed.feeds} className="w-4 h-4" />
                  <div className="truncate">{feed.feeds.title}</div>
                  {feed.feeds.errorAt && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <i className="i-mingcute-wifi-off-line shrink-0 ml-1 text-base" />
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent>
                            Error since{" "}
                            {dayjs
                              .duration(
                                dayjs(feed.feeds.errorAt).diff(
                                  dayjs(),
                                  "minute",
                                ),
                                "minute",
                              )
                              .humanize(true)}
                          </TooltipContent>
                        </TooltipPortal>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {feed.isPrivate && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <i className="i-mingcute-eye-close-line shrink-0 ml-1 text-base" />
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent>
                            Not publicly visible on your profile page
                          </TooltipContent>
                        </TooltipPortal>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {!!feed.unread && (
                  <div className="text-xs text-zinc-500 ml-2">
                    {feed.unread}
                  </div>
                )}
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </Collapsible>
  )
}
